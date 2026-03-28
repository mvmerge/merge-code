import { Hono } from "hono"

const PORT = Number(process.env.MERGE_RELAY_PORT ?? 4000)

// --- Types ---
type Role = "driver" | "observer"
type CollabMode = "pair" | "copilot" | "review"

type CollabEvent =
  | { type: "prompt"; sessionId: string; peerId: string; content: string }
  | { type: "response"; sessionId: string; peerId: string; chunk: string; done: boolean }
  | { type: "model_switch"; sessionId: string; peerId: string; newModel: string; contextHandoff: ContextHandoff }
  | { type: "diff"; sessionId: string; peerId: string; filepath: string; patch: string }
  | { type: "mode_change"; sessionId: string; peerId: string; mode: CollabMode }
  | { type: "peer_joined"; sessionId: string; peerId: string; role: Role }
  | { type: "peer_left"; sessionId: string; peerId: string }
  | { type: "approve"; sessionId: string; peerId: string }

type ContextHandoff = {
  recentMessages: ConversationTurn[]
  recentDiffs: DiffEntry[]
  fileTree: string
}

type ConversationTurn = { role: "user" | "assistant"; content: string }
type DiffEntry = { filepath: string; patch: string }

type Peer = {
  id: string
  role: Role
  ws: WebSocket & { send: (data: string) => void }
}

type Session = {
  id: string
  peers: Map<string, Peer>
  messages: ConversationTurn[]
  diffs: DiffEntry[]
  activeModel: string
  mode: CollabMode
  pendingPrompt: string | null
  createdAt: number
}

// --- In-memory state ---
const sessions = new Map<string, Session>()

function generateId(len = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let id = ""
  for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function buildContextHandoff(session: Session): ContextHandoff {
  return {
    recentMessages: session.messages.slice(-10),
    recentDiffs: session.diffs.slice(-5),
    fileTree: "",
  }
}

function broadcast(session: Session, event: CollabEvent, excludePeerId?: string) {
  const payload = JSON.stringify(event)
  for (const peer of session.peers.values()) {
    if (peer.id === excludePeerId) continue
    try {
      peer.ws.send(payload)
    } catch {}
  }
}

function send(peer: Peer, event: CollabEvent) {
  try {
    peer.ws.send(JSON.stringify(event))
  } catch {}
}

// --- HTTP + WS server via Bun ---
const app = new Hono()

app.post("/session/new", async (c) => {
  const sessionId = generateId(6)
  const session: Session = {
    id: sessionId,
    peers: new Map(),
    messages: [],
    diffs: [],
    activeModel: "",
    mode: "pair",
    pendingPrompt: null,
    createdAt: Date.now(),
  }
  sessions.set(sessionId, session)

  const joinUrl = `${process.env.MERGE_RELAY_URL ?? `http://localhost:${PORT}`}/session/${sessionId}`
  return c.json({ sessionId, joinUrl })
})

app.get("/session/:id/state", (c) => {
  const session = sessions.get(c.req.param("id"))
  if (!session) return c.json({ error: "session not found" }, 404)
  return c.json({
    id: session.id,
    peerCount: session.peers.size,
    activeModel: session.activeModel,
    mode: session.mode,
    messageCount: session.messages.length,
  })
})

// Bun native WebSocket upgrade
const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url)

    // Only attempt WebSocket upgrade for GET /session/:id (not /session/new or /session/:id/state)
    const wsMatch = url.pathname.match(/^\/session\/([^/]+)$/)
    const isWebSocketRequest = req.headers.get("upgrade")?.toLowerCase() === "websocket"
    if (wsMatch && isWebSocketRequest) {
      const sessionId = wsMatch[1]
      const role = (url.searchParams.get("role") as Role) ?? "observer"
      const peerId = url.searchParams.get("peerId") ?? generateId(8)

      const upgraded = server.upgrade(req, { data: { sessionId, role, peerId } })
      if (upgraded) return undefined
      return new Response("WebSocket upgrade failed", { status: 400 })
    }

    // Fall through to Hono for all HTTP routes
    return app.fetch(req)
  },

  websocket: {
    open(ws) {
      const { sessionId, role, peerId } = ws.data as { sessionId: string; role: Role; peerId: string }
      let session = sessions.get(sessionId)

      if (!session) {
        // Auto-create session if it doesn't exist (allows join to create)
        session = {
          id: sessionId,
          peers: new Map(),
          messages: [],
          diffs: [],
          activeModel: "",
          mode: "pair",
          pendingPrompt: null,
          createdAt: Date.now(),
        }
        sessions.set(sessionId, session)
      }

      const peer: Peer = { id: peerId, role, ws: ws as any }
      session.peers.set(peerId, peer)

      // Send current state to new peer
      send(peer, {
        type: "peer_joined",
        sessionId,
        peerId: "server",
        role: "observer",
      })

      // Send conversation history to the joiner
      for (const msg of session.messages) {
        try {
          ws.send(JSON.stringify({ type: "history", turn: msg }))
        } catch {}
      }

      // Broadcast peer_joined to everyone else
      broadcast(
        session,
        { type: "peer_joined", sessionId, peerId, role },
        peerId,
      )
    },

    message(ws, raw) {
      const { sessionId, peerId } = ws.data as { sessionId: string; peerId: string }
      const session = sessions.get(sessionId)
      if (!session) return

      const peer = session.peers.get(peerId)
      if (!peer) return

      let event: CollabEvent
      try {
        event = JSON.parse(raw as string) as CollabEvent
      } catch {
        return
      }

      switch (event.type) {
        case "prompt": {
          // copilot: only driver can send
          if (session.mode === "copilot" && peer.role !== "driver") return
          // review: hold prompt until approved
          if (session.mode === "review") {
            session.pendingPrompt = event.content
            broadcast(session, event, peerId)
            return
          }
          session.messages.push({ role: "user", content: event.content })
          broadcast(session, event, peerId)
          break
        }

        case "response": {
          if (event.done) {
            session.messages.push({ role: "assistant", content: event.chunk })
          }
          broadcast(session, event, peerId)
          break
        }

        case "model_switch": {
          session.activeModel = event.newModel
          // Prefer the client-provided contextHandoff (which includes file tree),
          // fall back to server-built one from stored messages/diffs
          const contextHandoff = event.contextHandoff && event.contextHandoff.fileTree
            ? event.contextHandoff
            : buildContextHandoff(session)
          broadcast(session, { ...event, contextHandoff }, peerId)
          break
        }

        case "diff": {
          session.diffs.push({ filepath: event.filepath, patch: event.patch })
          broadcast(session, event, peerId)
          break
        }

        case "mode_change": {
          session.mode = event.mode
          broadcast(session, event, peerId)
          break
        }

        case "approve": {
          if (session.mode !== "review") return
          if (!session.pendingPrompt) return
          const pending = session.pendingPrompt
          session.pendingPrompt = null
          session.messages.push({ role: "user", content: pending })
          broadcast(session, {
            type: "prompt",
            sessionId,
            peerId: "approved",
            content: pending,
          })
          break
        }

        default:
          broadcast(session, event, peerId)
      }
    },

    close(ws) {
      const { sessionId, peerId } = ws.data as { sessionId: string; peerId: string }
      const session = sessions.get(sessionId)
      if (!session) return

      session.peers.delete(peerId)
      broadcast(session, { type: "peer_left", sessionId, peerId })

      // Clean up empty sessions after 1 hour
      if (session.peers.size === 0) {
        setTimeout(() => {
          if (sessions.get(sessionId)?.peers.size === 0) {
            sessions.delete(sessionId)
          }
        }, 60 * 60 * 1000)
      }
    },
  },
})

console.log(`Merge relay server running on port ${PORT}`)
