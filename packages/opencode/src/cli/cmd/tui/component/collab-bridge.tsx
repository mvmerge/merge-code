/**
 * CollabBridge — mounts inside a Session and wires:
 *   SDK events  →  relay broadcast  (local → peers)
 *   relay events →  TUI actions      (peers → local)
 */
import { createEffect, onCleanup, onMount } from "solid-js"
import { useCollab, type CollabEvent } from "@tui/context/collab"
import { useSDK } from "@tui/context/sdk"
import { useToast } from "@tui/ui/toast"
import { useLocal } from "@tui/context/local"
import { Provider } from "@/provider/provider"
import path from "path"
import fs from "fs"

type Props = {
  sessionId: string
  /** called when a remote peer sends a prompt (so Session can inject it) */
  onRemotePrompt?: (content: string) => void
}

export function CollabBridge(props: Props) {
  const collab = useCollab()
  const sdk = useSDK()
  const toast = useToast()
  const local = useLocal()

  // ── local SDK events → relay broadcast ──────────────────────────────────
  // Use createEffect so subscriptions are set up (and torn down) whenever
  // the connected state changes — handles the common case where the user
  // opens a session first and joins collab later.

  createEffect(() => {
    if (!collab.state.connected) return

    // 1. Response chunks streaming out of the AI → broadcast to peers
    const unsubDelta = sdk.event.on("message.part.delta", (evt) => {
      if (!collab.state.connected) return
      if (evt.properties.field !== "text") return
      collab.sendEvent({
        type: "response",
        sessionId: collab.state.sessionId,
        peerId: collab.state.peerId ?? "local",
        chunk: evt.properties.delta,
        done: false,
      })
    })

    // 2. Message fully completed → signal done
    const unsubMsg = sdk.event.on("message.updated", (evt) => {
      if (!collab.state.connected) return
      const msg = evt.properties.info
      if (msg.role !== "assistant") return
      if (!msg.time.completed) return
      collab.sendEvent({
        type: "response",
        sessionId: collab.state.sessionId,
        peerId: collab.state.peerId ?? "local",
        chunk: "",
        done: true,
      })
    })

    // 3. File diff → broadcast diff event
    const unsubDiff = sdk.event.on("session.diff", (evt) => {
      if (!collab.state.connected) return
      if (evt.properties.sessionID !== props.sessionId) return
      const diff = evt.properties.diff ?? ""
      if (!diff) return
      collab.sendEvent({
        type: "diff",
        sessionId: collab.state.sessionId,
        peerId: collab.state.peerId ?? "local",
        filepath: "",
        patch: diff,
      })
    })

    onCleanup(() => {
      unsubDelta()
      unsubMsg()
      unsubDiff()
    })
  })

  // ── relay events → local TUI actions ────────────────────────────────────

  onMount(() => {
    const unsub = collab.onIncoming((event: CollabEvent) => {
      switch (event.type) {
        case "prompt": {
          // A remote peer sent a prompt — show it and optionally inject into local session
          if (event.peerId === collab.state.peerId || event.peerId === "approved") return

          if (collab.state.mode === "review") {
            // Review mode: only the driver runs it, and only after approving
            if (collab.state.role !== "driver") {
              toast.show({
                variant: "warning",
                title: "Prompt awaiting approval",
                message: "Run /collab approve on the driver to execute it",
                duration: 5000,
              })
            }
            break
          }

          if (collab.state.mode === "copilot") {
            // Copilot mode: only the driver sends prompts; observers just see results
            break
          }

          // Pair mode: ALL peers run the remote prompt locally
          toast.show({
            variant: "info",
            title: `Peer prompt (${event.peerId.slice(0, 6)})`,
            message: event.content.length > 120 ? event.content.slice(0, 120) + "…" : event.content,
            duration: 4000,
          })
          props.onRemotePrompt?.(event.content)
          break
        }

        case "response": {
          // Remote AI response chunk — only observers need to display this
          // (drivers already see it via their own session)
          if (collab.state.role !== "observer") return
          if (event.done) {
            toast.show({
              variant: "info",
              message: "Remote agent finished responding",
              duration: 3000,
            })
          }
          break
        }

        case "diff": {
          if (collab.state.role !== "observer") return
          const filepath = event.filepath || "(file)"
          toast.show({
            variant: "info",
            title: "File changed by peer",
            message: filepath,
            duration: 5000,
          })
          break
        }

        case "model_switch": {
          // Observers follow the driver's model automatically
          if (collab.state.role === "observer" && event.newModel) {
            try {
              const parsed = Provider.parseModel(event.newModel)
              local.model.set(parsed, { recent: false })
              toast.show({
                variant: "info",
                title: "Model synced from peer",
                message: event.newModel,
                duration: 4000,
              })
            } catch {
              toast.show({
                variant: "info",
                title: "Peer switched model",
                message: event.newModel,
                duration: 4000,
              })
            }
          } else {
            toast.show({
              variant: "info",
              title: "Peer switched model",
              message: event.newModel,
              duration: 4000,
            })
          }
          break
        }

        case "history": {
          break
        }

        case "approve": {
          toast.show({
            variant: "success",
            message: "Pending collaboration prompt approved",
            duration: 3000,
          })
          break
        }

        case "peer_joined": {
          toast.show({
            variant: "info",
            message: `Peer joined as ${event.role} (${event.peerId.slice(0, 6)})`,
            duration: 4000,
          })
          break
        }

        case "peer_left": {
          toast.show({
            variant: "info",
            message: `Peer disconnected (${event.peerId.slice(0, 6)})`,
            duration: 4000,
          })
          break
        }

        case "mode_change": {
          toast.show({
            variant: "info",
            message: `Collaboration mode changed to: ${event.mode}`,
            duration: 4000,
          })
          break
        }
      }
    })

    onCleanup(unsub)
  })

  // Component renders nothing — pure side-effect bridge
  return null as any
}

/** Capture a snapshot of the current working directory file tree (max depth 3) */
export function captureFileTree(cwd: string): string {
  function walk(dir: string, depth: number, prefix = ""): string {
    if (depth === 0) return ""
    let out = ""
    let entries: string[]
    try {
      entries = fs.readdirSync(dir).filter((e) => !e.startsWith(".") && e !== "node_modules")
    } catch {
      return ""
    }
    for (const entry of entries) {
      const full = path.join(dir, entry)
      let isDir = false
      try { isDir = fs.statSync(full).isDirectory() } catch {}
      out += `${prefix}${entry}${isDir ? "/" : ""}\n`
      if (isDir) out += walk(full, depth - 1, prefix + "  ")
    }
    return out
  }
  return walk(cwd, 3)
}
