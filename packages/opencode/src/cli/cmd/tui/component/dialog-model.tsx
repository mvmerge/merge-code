import { createMemo, createSignal } from "solid-js"
import { useLocal } from "@tui/context/local"
import { useSync } from "@tui/context/sync"
import { map, pipe, flatMap, entries, filter, sortBy, take } from "remeda"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { createDialogProviderOptions, DialogProvider } from "./dialog-provider"
import { DialogVariant } from "./dialog-variant"
import { useKeybind } from "../context/keybind"
import * as fuzzysort from "fuzzysort"
import { useCollab } from "@tui/context/collab"
import { useRoute } from "@tui/context/route"
import { captureFileTree } from "@tui/component/collab-bridge"

const MERGE_FIRST_CLASS_MODELS = [
  { providerID: "anthropic", modelID: "claude-code", name: "Claude Code", description: "Anthropic" },
  { providerID: "openai", modelID: "codex-mini-latest", name: "OpenAI Codex", description: "OpenAI" },
  { providerID: "google", modelID: "gemini-2.5-pro", name: "Google Gemini", description: "Google" },
  { providerID: "antigravity", modelID: "antigravity-1", name: "Google Antigravity", description: "Google (Preview)" },
] as const

export function useConnected() {
  const sync = useSync()
  return createMemo(() =>
    sync.data.provider.some((x) => x.id !== "merge" || Object.values(x.models).some((y) => y.cost?.input !== 0)),
  )
}

export function DialogModel(props: { providerID?: string }) {
  const local = useLocal()
  const sync = useSync()
  const dialog = useDialog()
  const keybind = useKeybind()
  const collab = useCollab()
  const route = useRoute()
  const [query, setQuery] = createSignal("")

  const connected = useConnected()
  const providers = createDialogProviderOptions()

  const showExtra = createMemo(() => connected() && !props.providerID)

  const options = createMemo(() => {
    const needle = query().trim()
    const showSections = showExtra() && needle.length === 0
    const favorites = connected() ? local.model.favorite() : []
    const recents = local.model.recent()

    function toOptions(items: typeof favorites, category: string) {
      if (!showSections) return []
      return items.flatMap((item) => {
        const provider = sync.data.provider.find((x) => x.id === item.providerID)
        if (!provider) return []
        const model = provider.models[item.modelID]
        if (!model) return []
        return [
          {
            key: item,
            value: { providerID: provider.id, modelID: model.id },
            title: model.name ?? item.modelID,
            description: provider.name,
            category,
            disabled: provider.id === "merge" && model.id.includes("-nano"),
            footer: model.cost?.input === 0 && provider.id === "merge" ? "Free" : undefined,
            onSelect: () => {
              onSelect(provider.id, model.id)
            },
          },
        ]
      })
    }

    const favoriteOptions = toOptions(favorites, "Favorites")
    const recentOptions = toOptions(
      recents.filter(
        (item) => !favorites.some((fav) => fav.providerID === item.providerID && fav.modelID === item.modelID),
      ),
      "Recent",
    )

    const providerOptions = pipe(
      sync.data.provider,
      sortBy(
        (provider) => provider.id !== "merge",
        (provider) => provider.name,
      ),
      flatMap((provider) =>
        pipe(
          provider.models,
          entries(),
          filter(([_, info]) => info.status !== "deprecated"),
          filter(([_, info]) => (props.providerID ? info.providerID === props.providerID : true)),
          map(([model, info]) => ({
            value: { providerID: provider.id, modelID: model },
            title: info.name ?? model,
            description: favorites.some((item) => item.providerID === provider.id && item.modelID === model)
              ? "(Favorite)"
              : undefined,
            category: connected() ? provider.name : undefined,
            disabled: provider.id === "merge" && model.includes("-nano"),
            footer: info.cost?.input === 0 && provider.id === "merge" ? "Free" : undefined,
            onSelect() {
              onSelect(provider.id, model)
            },
          })),
          filter((x) => {
            if (!showSections) return true
            if (favorites.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
              return false
            if (recents.some((item) => item.providerID === x.value.providerID && item.modelID === x.value.modelID))
              return false
            return true
          }),
          sortBy(
            (x) => x.footer !== "Free",
            (x) => x.title,
          ),
        ),
      ),
    )

    const popularProviders = !connected()
      ? pipe(
          providers(),
          map((option) => ({
            ...option,
            category: "Popular providers",
          })),
          take(6),
        )
      : []

    // Merge first-class models (always shown at top)
    const mergeModels = MERGE_FIRST_CLASS_MODELS
      .filter((m) => !props.providerID || m.providerID === props.providerID)
      .filter((m) => {
        // hide if already in favorites or recents
        if (favorites.some((f) => f.providerID === m.providerID && f.modelID === m.modelID)) return false
        if (recents.some((r) => r.providerID === m.providerID && r.modelID === m.modelID)) return false
        return true
      })
      .map((m) => ({
        value: { providerID: m.providerID, modelID: m.modelID },
        title: m.name,
        description: m.description,
        category: "Merge",
        onSelect() { onSelect(m.providerID, m.modelID) },
      }))

    if (needle) {
      return [
        ...fuzzysort.go(needle, [...mergeModels, ...providerOptions], { keys: ["title", "category"] }).map((x) => x.obj),
        ...fuzzysort.go(needle, popularProviders, { keys: ["title"] }).map((x) => x.obj),
      ]
    }

    return [...mergeModels, ...favoriteOptions, ...recentOptions, ...providerOptions, ...popularProviders]
  })

  const provider = createMemo(() =>
    props.providerID ? sync.data.provider.find((x) => x.id === props.providerID) : null,
  )

  const title = createMemo(() => provider()?.name ?? "Select model")

  function onSelect(providerID: string, modelID: string) {
    local.model.set({ providerID, modelID }, { recent: true })
    // Broadcast model_switch to collab peers with full context handoff
    if (collab.state.connected) {
      const cwd = (typeof process !== "undefined" && process.cwd()) || ""
      const fileTree = cwd ? captureFileTree(cwd) : ""
      // Build recent messages from sync store for current session
      const recentMessages = (route.data.type === "session" ? (sync.data.message[route.data.sessionID] ?? []) : [])
        .slice(-10)
        .map((m) => ({
          role: m.role as string,
          content: (sync.data.part[m.id] ?? [])
            .flatMap((p) => (p.type === "text" ? [p.text] : []))
            .join("\n"),
        }))
      collab.sendEvent({
        type: "model_switch",
        sessionId: collab.state.sessionId,
        peerId: collab.state.peerId ?? "local",
        newModel: `${providerID}/${modelID}`,
        contextHandoff: { recentMessages, recentDiffs: [], fileTree },
      })
    }
    if (local.model.variant.list().length > 0) {
      dialog.replace(() => <DialogVariant />)
      return
    }
    dialog.clear()
  }

  return (
    <DialogSelect<ReturnType<typeof options>[number]["value"]>
      options={options()}
      keybind={[
        {
          keybind: keybind.all.model_provider_list?.[0],
          title: connected() ? "Connect provider" : "View all providers",
          onTrigger() {
            dialog.replace(() => <DialogProvider />)
          },
        },
        {
          keybind: keybind.all.model_favorite_toggle?.[0],
          title: "Favorite",
          disabled: !connected(),
          onTrigger: (option) => {
            local.model.toggleFavorite(option.value as { providerID: string; modelID: string })
          },
        },
      ]}
      onFilter={setQuery}
      flat={true}
      skipFilter={true}
      title={title()}
      current={local.model.current()}
    />
  )
}
