<p align="center">
  <a href="https://merge.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Merge logo">
    </picture>
  </a>
</p>
<p align="center">AI-kodeagent med åpen kildekode.</p>
<p align="center">
  <a href="https://merge.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/merge-ai"><img alt="npm" src="https://img.shields.io/npm/v/merge-ai?style=flat-square" /></a>
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

### Installasjon

```bash
# YOLO
curl -fsSL https://merge.ai/install | bash

# Pakkehåndterere
npm i -g merge-ai@latest        # eller bun/pnpm/yarn
scoop install merge             # Windows
choco install merge             # Windows
brew install anomalyco/tap/merge # macOS og Linux (anbefalt, alltid oppdatert)
brew install merge              # macOS og Linux (offisiell brew-formel, oppdateres sjeldnere)
sudo pacman -S merge            # Arch Linux (Stable)
paru -S merge-bin               # Arch Linux (Latest from AUR)
mise use -g merge               # alle OS
nix run nixpkgs#merge           # eller github:anomalyco/merge for nyeste dev-branch
```

> [!TIP]
> Fjern versjoner eldre enn 0.1.x før du installerer.

### Desktop-app (BETA)

Merge er også tilgjengelig som en desktop-app. Last ned direkte fra [releases-siden](https://github.com/anomalyco/merge/releases) eller [merge.ai/download](https://merge.ai/download).

| Plattform             | Nedlasting                            |
| --------------------- | ------------------------------------- |
| macOS (Apple Silicon) | `merge-desktop-darwin-aarch64.dmg` |
| macOS (Intel)         | `merge-desktop-darwin-x64.dmg`     |
| Windows               | `merge-desktop-windows-x64.exe`    |
| Linux                 | `.deb`, `.rpm` eller AppImage         |

```bash
# macOS (Homebrew)
brew install --cask merge-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/merge-desktop
```

#### Installasjonsmappe

Installasjonsskriptet bruker følgende prioritet for installasjonsstien:

1. `$MERGE_INSTALL_DIR` - Egendefinert installasjonsmappe
2. `$XDG_BIN_DIR` - Sti som følger XDG Base Directory Specification
3. `$HOME/bin` - Standard brukerbinar-mappe (hvis den finnes eller kan opprettes)
4. `$HOME/.merge/bin` - Standard fallback

```bash
# Eksempler
MERGE_INSTALL_DIR=/usr/local/bin curl -fsSL https://merge.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://merge.ai/install | bash
```

### Agents

Merge har to innebygde agents du kan bytte mellom med `Tab`-tasten.

- **build** - Standard, agent med full tilgang for utviklingsarbeid
- **plan** - Skrivebeskyttet agent for analyse og kodeutforsking
  - Nekter filendringer som standard
  - Spør om tillatelse før bash-kommandoer
  - Ideell for å utforske ukjente kodebaser eller planlegge endringer

Det finnes også en **general**-subagent for komplekse søk og flertrinnsoppgaver.
Den brukes internt og kan kalles via `@general` i meldinger.

Les mer om [agents](https://merge.ai/docs/agents).

### Dokumentasjon

For mer info om hvordan du konfigurerer Merge, [**se dokumentasjonen**](https://merge.ai/docs).

### Bidra

Hvis du vil bidra til Merge, les [contributing docs](./CONTRIBUTING.md) før du sender en pull request.

### Bygge på Merge

Hvis du jobber med et prosjekt som er relatert til Merge og bruker "merge" som en del av navnet; for eksempel "merge-dashboard" eller "merge-mobile", legg inn en merknad i README som presiserer at det ikke er bygget av Merge-teamet og ikke er tilknyttet oss på noen måte.

### FAQ

#### Hvordan er dette forskjellig fra Claude Code?

Det er veldig likt Claude Code når det gjelder funksjonalitet. Her er de viktigste forskjellene:

- 100% open source
- Ikke knyttet til en bestemt leverandør. Selv om vi anbefaler modellene vi tilbyr gjennom [Merge Zen](https://merge.ai/zen); kan Merge brukes med Claude, OpenAI, Google eller til og med lokale modeller. Etter hvert som modellene utvikler seg vil gapene lukkes og prisene gå ned, så det er viktig å være provider-agnostic.
- LSP-støtte rett ut av boksen
- Fokus på TUI. Merge er bygget av neovim-brukere og skaperne av [terminal.shop](https://terminal.shop); vi kommer til å presse grensene for hva som er mulig i terminalen.
- Klient/server-arkitektur. Dette kan for eksempel la Merge kjøre på maskinen din, mens du styrer den eksternt fra en mobilapp. Det betyr at TUI-frontend'en bare er en av de mulige klientene.

---

**Bli med i fellesskapet** [Discord](https://discord.gg/merge) | [X.com](https://x.com/merge)
