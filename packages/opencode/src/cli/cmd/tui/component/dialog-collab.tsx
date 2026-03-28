import { batch, createMemo, onMount } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { useCollab, type CollabMode } from "@tui/context/collab"
import { useToast } from "@tui/ui/toast"
import { useLocal } from "@tui/context/local"
import { Clipboard } from "@tui/util/clipboard"

// ── Join sub-dialogs (session ID → role → connect) ──────────────────────────

function DialogCollabJoinRole(props: { sessionId: string }) {
  const dialog = useDialog()
  const collab = useCollab()
  const toast = useToast()
  const local = useLocal()

  const roleOptions = [
    { title: "Driver  — you run prompts, peers observe or co-pilot", value: "driver" },
    { title: "Observer — you watch the driver's session", value: "observer" },
  ]

  async function connect(role: "driver" | "observer") {
    const m = local.model.current()
    const initialModel = m ? `${m.providerID}/${m.modelID}` : undefined
    try {
      await collab.connect(props.sessionId, role, initialModel)
      toast.show({
        variant: "success",
        message: `Joined session ${props.sessionId} as ${role}`,
        duration: 5000,
      })
      dialog.clear()
    } catch {
      toast.show({
        variant: "error",
        message: `Could not connect to session ${props.sessionId}`,
        duration: 5000,
      })
      dialog.replace(() => <DialogCollab />)
    }
  }

  return (
    <DialogSelect
      title={`Join ${props.sessionId} — pick your role`}
      options={roleOptions}
      skipFilter={true}
      onSelect={(opt) => connect(opt.value as "driver" | "observer")}
    />
  )
}

function DialogCollabJoin() {
  const dialog = useDialog()

  return (
    <DialogPrompt
      title="Join collaboration session"
      placeholder="Session ID  (e.g. AB1234)"
      onConfirm={(raw) => {
        const sessionId = raw.trim().toUpperCase()
        if (!sessionId) return
        dialog.replace(() => <DialogCollabJoinRole sessionId={sessionId} />)
      }}
      onCancel={() => dialog.replace(() => <DialogCollab />)}
    />
  )
}

// ── Main dialog ─────────────────────────────────────────────────────────────

export function DialogCollab() {
  const dialog = useDialog()
  const collab = useCollab()
  const toast = useToast()
  const local = useLocal()

  onMount(() => dialog.setSize("medium"))

  // ── active session options ─────────────────────────────────────────────

  const activeOptions = createMemo(() => {
    const s = collab.state
    const mark = (m: CollabMode) => (s.mode === m ? "● " : "  ")

    const opts = [
      {
        title: `${mark("pair")}pair — both peers run prompts`,
        value: "mode:pair",
        category: "Mode",
      },
      {
        title: `${mark("copilot")}copilot — driver runs, observers watch`,
        value: "mode:copilot",
        category: "Mode",
      },
      {
        title: `${mark("review")}review — driver approves before running`,
        value: "mode:review",
        category: "Mode",
      },
      {
        title: "Copy session ID",
        value: "copy",
        category: "Actions",
      },
      {
        title: "Disconnect",
        value: "disconnect",
        category: "Actions",
      },
    ]

    if (s.mode === "review" && s.role === "driver" && s.pendingPrompt) {
      opts.splice(3, 0, {
        title: "Approve pending prompt",
        value: "approve",
        category: "Actions",
      })
    }

    return opts
  })

  function handleActiveSelect(value: string) {
    if (value.startsWith("mode:")) {
      const mode = value.split(":")[1] as CollabMode
      collab.setMode(mode)
      toast.show({ variant: "info", message: `Mode → ${mode}`, duration: 2500 })
      return
    }
    if (value === "approve") {
      collab.approve()
      toast.show({ variant: "success", message: "Prompt approved — executing", duration: 3000 })
      dialog.clear()
      return
    }
    if (value === "copy") {
      const id = collab.state.sessionId ?? ""
      Clipboard.copy(id)
        .then(() => toast.show({ variant: "info", message: `Copied ${id}`, duration: 3000 }))
        .catch(() => toast.show({ variant: "info", message: `Session ID: ${id}`, duration: 8000 }))
      return
    }
    if (value === "disconnect") {
      batch(() => {
        collab.disconnect()
        dialog.clear()
      })
      toast.show({ variant: "info", message: "Disconnected", duration: 3000 })
    }
  }

  // ── disconnected options ───────────────────────────────────────────────

  const disconnectedOptions = [
    { title: "Start new session", value: "start" },
    { title: "Join existing session", value: "join" },
  ]

  async function handleDisconnectedSelect(value: string) {
    if (value === "join") {
      dialog.replace(() => <DialogCollabJoin />)
      return
    }
    if (value === "start") {
      try {
        const m = local.model.current()
        const initialModel = m ? `${m.providerID}/${m.modelID}` : undefined
        const id = await collab.create(initialModel)
        Clipboard.copy(id).catch(() => {})
        toast.show({
          variant: "success",
          title: `Session ${id} started`,
          message: "Share this ID with collaborators. Copied to clipboard.",
          duration: 12000,
        })
        // re-open to show the active-session menu
        dialog.replace(() => <DialogCollab />)
      } catch {
        toast.show({
          variant: "error",
          message: "Could not reach relay on port 4000",
          duration: 6000,
        })
      }
    }
  }

  // ── render ─────────────────────────────────────────────────────────────

  const activeTitle = createMemo(() => {
    const s = collab.state
    const peers = s.peers.length
    return `${s.sessionId ?? "…"}  ·  ${s.role}  ·  ${peers} peer${peers !== 1 ? "s" : ""}`
  })

  if (collab.state.connected) {
    return (
      <DialogSelect
        title={activeTitle()}
        options={activeOptions()}
        skipFilter={true}
        onSelect={(opt) => handleActiveSelect(opt.value)}
      />
    )
  }

  return (
    <DialogSelect
      title="Collaborate"
      options={disconnectedOptions}
      skipFilter={true}
      onSelect={(opt) => handleDisconnectedSelect(opt.value)}
    />
  )
}
