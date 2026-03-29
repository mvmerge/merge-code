<p align="center">
  <a href="https://merge.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="https://i.postimg.cc/FznvwH6w/ascii-art-text-(1).png" alt="Merge logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://merge.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://github.com/mvmerge/merge-code/pkgs/npm/merge"><img alt="version" src="https://img.shields.io/github/package-json/v/mvmerge/merge-code?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/merge/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/merge/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![Merge Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://merge.ai)

---

### Installation

```bash
curl -fsSL https://raw.githubusercontent.com/mvmerge/merge-code/dev/install.sh | bash
```

Then run:

```bash
merge
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

Merge is also available as a desktop application. Download directly from the [releases page](https://github.com/anomalyco/merge/releases) or [merge.ai/download](https://merge.ai/download).

| Platform              | Download                              |
| --------------------- | ------------------------------------- |
| macOS (Apple Silicon) | `merge-desktop-darwin-aarch64.dmg` |
| macOS (Intel)         | `merge-desktop-darwin-x64.dmg`     |
| Windows               | `merge-desktop-windows-x64.exe`    |
| Linux                 | `.deb`, `.rpm`, or AppImage           |

```bash
# macOS (Homebrew)
brew install --cask merge-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/merge-desktop
```

#### Installation Directory

The install script respects the following priority order for the installation path:

1. `$MERGE_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if it exists or can be created)
4. `$HOME/.merge/bin` - Default fallback

```bash
# Examples
MERGE_INSTALL_DIR=/usr/local/bin curl -fsSL https://merge.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://merge.ai/install | bash
```

### Agents

Merge includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://merge.ai/docs/agents).

### Documentation

For more info on how to configure Merge, [**head over to our docs**](https://merge.ai/docs).

### Contributing

If you're interested in contributing to Merge, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on Merge

If you are working on a project that's related to Merge and is using "merge" as part of its name, for example "merge-dashboard" or "merge-mobile", please add a note to your README to clarify that it is not built by the Merge team and is not affiliated with us in any way.

### FAQ

#### How is this different from Claude Code?

It's very similar to Claude Code in terms of capability. Here are the key differences:

- 100% open source
- Not coupled to any provider. Although we recommend the models we provide through [Merge Zen](https://merge.ai/zen), Merge can be used with Claude, OpenAI, Google, or even local models. As models evolve, the gaps between them will close and pricing will drop, so being provider-agnostic is important.
- Out-of-the-box LSP support
- A focus on TUI. Merge is built by neovim users and the creators of [terminal.shop](https://terminal.shop); we are going to push the limits of what's possible in the terminal.
- A client/server architecture. This, for example, can allow Merge to run on your computer while you drive it remotely from a mobile app, meaning that the TUI frontend is just one of the possible clients.

---

**Join our community** [Discord](https://discord.gg/merge) | [X.com](https://x.com/merge)
