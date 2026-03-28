import { $ } from "bun"

import { copyBinaryToSidecarFolder, getCurrentSidecar, windowsify } from "./utils"

await $`bun ./scripts/copy-icons.ts ${process.env.MERGE_CHANNEL ?? "dev"}`

const RUST_TARGET = Bun.env.RUST_TARGET

const sidecarConfig = getCurrentSidecar(RUST_TARGET)

const binaryPath = windowsify(`../merge/dist/${sidecarConfig.ocBinary}/bin/merge`)

await (sidecarConfig.ocBinary.includes("-baseline")
  ? $`cd ../merge && bun run build --single --baseline`
  : $`cd ../merge && bun run build --single`)

await copyBinaryToSidecarFolder(binaryPath, RUST_TARGET)
