import { createContext, useContext, type ParentProps } from "solid-js"
import { createStore } from "solid-js/store"
import { Flag } from "@/flag/flag"

export type CollabMode = "pair" | "copilot" | "review"
export type CollabRole = "driver" | "observer"

export type CollabPeer = {
  id: string
  role: CollabRole
}

export type CollabEvent =
  | { type: "prompt"; sessionId: string; peerId: string; content: string }
  | { type: "response"; sessionId: string; peerId: string; chunk: string; done: boolean }
  | { type: "model_switch"; sessionId: string; peerId: string; newModel: string; contextHandoff: ContextHandoff }
  | { type: "diff"; sessionId: string; peerId: string; filepath: string; patch: string }
  | { type: "mode_change"; sessionId: string; peerId: string; mode: CollabMode }
  | { type: "peer_joined"; sessionId: string; peerId: string; role: CollabRole }
  | { type: "peer_left"; sessionId: string; peerId: string }
  | { type: "approve"; sessionId: string; peerId: string }
  | { type: "history"; turn: { role: string; content: string } }

export type ContextHandoff = {
  recentMessages: { role: string; content: string }[]
  recentDiffs: { filepath: string; patch: string }[]
  fileTree: string
}

type CollabState = {
  sessionId: string | null
  peerId: string | null
  role: CollabRole
  mode: CollabMode
  peers: CollabPeer[]
  connected: boolean
  pendingPrompt: string | null
  /** accumulated remote response while streaming */
  remoteResponseBuffer: string
  /** whether a remote response is currently streaming */
  remoteStreaming: boolean
}

type EventHandler = (event: CollabEvent) => void

type CollabContext = {
  state: CollabState
  ws: WebSocket | null
  /** Create a new session on the relay and connect as driver. Returns the session ID. */
  create: (initialModel?: string) => Promise<string>
  connect: (sessionId: string, role: CollabRole, initialModel?: string) => Promise<void>
  disconnect: () => void
  sendEvent: (event: object) => void
  setMode: (mode: CollabMode) => void
  approve: () => void
  /** register a listener for events received FROM the relay (remote peers) */
  onIncoming: (handler: EventHandler) => () => void
}

const ctx = createContext<CollabContext>()

export function useCollab() {
  const c = useContext(ctx)
  if (!c) throw new Error("useCollab must be used inside CollabProvider")
  return c
}

export function CollabProvider(props: ParentProps) {
  const [state, setState] = createStore<CollabState>({
    sessionId: null,
    peerId: null,
    role: "observer",
    mode: "pair",
    peers: [],
    connected: false,
    pendingPrompt: null,
    remoteResponseBuffer: "",
    remoteStreaming: false,
  })

  let ws: WebSocket | null = null
  const handlers = new Set<EventHandler>()

  function sendEvent(event: object) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event))
    }
  }

  function dispatchIncoming(event: CollabEvent) {
    for (const h of handlers) {
      try { h(event) } catch {}
    }
  }

  function onIncoming(handler: EventHandler) {
    handlers.add(handler)
    return () => handlers.delete(handler)
  }

  async function connect(sessionId: string, role: CollabRole, initialModel?: string) {
    const relayUrl = Flag.MERGE_RELAY_URL ?? "http://localhost:4000"
    const peerId = crypto.randomUUID().slice(0, 8).toUpperCase()
    const wsUrl =
      relayUrl.replace(/^http/, "ws") +
      `/session/${sessionId}?role=${role}&peerId=${encodeURIComponent(peerId)}`

    ws?.close()
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setState({ sessionId, peerId, role, connected: true, pendingPrompt: null })
      // Broadcast our current model so peers know what we're using
      if (initialModel) {
        sendEvent({
          type: "model_switch",
          sessionId,
          peerId,
          newModel: initialModel,
          contextHandoff: { recentMessages: [], recentDiffs: [], fileTree: "" },
        })
      }
    }

    ws.onmessage = (evt) => {
      let event: CollabEvent
      try {
        event = JSON.parse(evt.data as string) as CollabEvent
      } catch {
        return
      }

      // Update reactive state for peer tracking and mode
      switch (event.type) {
        case "peer_joined":
          setState("peers", (peers) => {
            if (peers.find((p) => p.id === event.peerId)) return peers
            return [...peers, { id: event.peerId, role: event.role }]
          })
          break
        case "peer_left":
          setState("peers", (peers) => peers.filter((p) => p.id !== event.peerId))
          break
        case "mode_change":
          setState("mode", event.mode)
          break
        case "prompt":
          setState("pendingPrompt", event.peerId === "approved" ? null : event.content)
          break
        case "approve":
          setState("pendingPrompt", null)
          break
        case "response":
          if (event.done) {
            setState({ remoteStreaming: false, remoteResponseBuffer: "" })
          } else {
            setState({
              remoteStreaming: true,
              remoteResponseBuffer: state.remoteResponseBuffer + event.chunk,
            })
          }
          break
      }

      // Dispatch to all registered handlers (bridge, TUI, etc.)
      dispatchIncoming(event)
    }

    ws.onclose = () => {
      setState({
        connected: false,
        peers: [],
        peerId: null,
        pendingPrompt: null,
        remoteStreaming: false,
        remoteResponseBuffer: "",
      })
    }
  }

  function disconnect() {
    ws?.close()
    ws = null
    setState({
      sessionId: null,
      peerId: null,
      connected: false,
      peers: [],
      role: "observer",
      mode: "pair",
      pendingPrompt: null,
      remoteStreaming: false,
      remoteResponseBuffer: "",
    })
  }

  function setMode(mode: CollabMode) {
    setState("mode", mode)
    sendEvent({ type: "mode_change", mode, sessionId: state.sessionId, peerId: state.peerId ?? "local" })
  }

  function approve() {
    sendEvent({ type: "approve", sessionId: state.sessionId, peerId: state.peerId ?? "local" })
  }

  async function create(initialModel?: string): Promise<string> {
    const relayUrl = Flag.MERGE_RELAY_URL ?? "http://localhost:4000"
    const resp = await fetch(`${relayUrl}/session/new`, { method: "POST" })
    if (!resp.ok) throw new Error(`relay returned ${resp.status}`)
    const { sessionId } = (await resp.json()) as { sessionId: string }
    await connect(sessionId, "driver", initialModel)
    return sessionId
  }

  const value: CollabContext = {
    get state() { return state },
    get ws() { return ws },
    create,
    connect,
    disconnect,
    sendEvent,
    setMode,
    approve,
    onIncoming,
  }

  return <ctx.Provider value={value}>{props.children}</ctx.Provider>
}
