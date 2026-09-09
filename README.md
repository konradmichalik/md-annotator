<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/images/logo.svg">
  <img alt="annotaitr" src="docs/images/logo.svg" width="300">
</picture>

# annotaitr

An AI coding agent plugin that opens images, captured web pages, or Markdown files in a browser-based annotator.

[![Test](https://github.com/konradmichalik/annotaitr/actions/workflows/test.yml/badge.svg)](https://github.com/konradmichalik/annotaitr/actions/workflows/test.yml)
[![License](https://img.shields.io/github/license/konradmichalik/annotaitr)](LICENSE)

![annotaitr](docs/images/screenshot.jpg)

</div>

An AI coding agent can read source code but has no way to point at a rendered
page or a prose document and say "this, right here." annotaitr closes that
gap: it captures a web page or opens an image or Markdown file in the
browser, lets a person mark it up with boxes, arrows and comments or with
text selections, and hands the agent back structured feedback it can act on
directly, instead of the person writing out pixel coordinates or line
numbers by hand.

## ✨ Features

Which mode runs is auto-detected from the target — see Usage below and
[How annotaitr works](docs/how-it-works.md) for the mechanism behind both.

**Image and web page review:**

- **Web page capture**: full-page screenshot of any `http(s)` URL via Playwright, at a chosen viewport
- **Clipboard support**: run with no target to annotate whatever screenshot is on the (macOS) clipboard
- **Drawing tools**: boxes, arrows, freehand marks, and numbered comment pins, each with an optional comment and color
- **Coarse position descriptions**: feedback names each annotation's plain-language position, and flags annotations positioned close together
- **Annotated screenshot export**: submitting bakes the markup into a copy of the image and passes its path to the agent

**Markdown and plain-text review:**

- **Multi-file support**: review multiple files in one session with a tabbed interface
- **Config and data files**: annotate YAML, JSON, TOML, CSV, XML and more as raw source with line numbers
- **Linked navigation**: click relative `.md` links to open them as new tabs
- **LaTeX math, Mermaid, PlantUML, and Kroki diagrams**: rendered inline, annotatable as a whole
- **File references**: type `@` in a comment to autocomplete other project files
- **Quick labels**: categorize a selection instantly with a predefined label
- **Annotation persistence**: annotations auto-save to the server and survive page reloads

**Both modes:**

- **Export and import**: annotations as Markdown or JSON, to continue a review later
- **Dark mode**, **undo/redo**, and an **auto-close** timer after submitting
- **Iterative review**: the agent applies your feedback and re-opens the annotator for another round until you approve

## 🔥 Installation

> [!IMPORTANT]
> Requires Node.js 22+ and npm. Image mode additionally needs `playwright`
> and `@napi-rs/canvas`, both `optionalDependencies` installed by default —
> a markdown-only install can skip them and gets an actionable error if
> image mode is ever invoked without them.

### Claude Code plugin

```bash
claude plugin marketplace add konradmichalik/annotaitr
claude plugin install annotate@annotaitr
```

Or via the installer script, which also installs the standalone CLI:

```bash
curl -fsSL https://konradmichalik.github.io/annotaitr/install.sh | bash
```

### OpenCode plugin

Markdown-only for now. Add to `opencode.json`:

```json
{
  "plugin": ["annotaitr-opencode@latest"]
}
```

### Mistral Vibe skill

Markdown-only for now, and drives the standalone CLI, so install that too:

```bash
curl -fsSL https://konradmichalik.github.io/annotaitr/install.sh | bash
cp -r apps/vibe/skills/annotate ~/.vibe/skills/annotate
```

### Standalone CLI

```bash
npm install -g annotaitr
```

## 🚀 Quick start

```bash
annotaitr README.md
```

Opens `README.md` in the browser; approve it or leave annotations, and
`annotaitr` prints the result to stdout once you're done.

## ⚡ Usage

**Claude Code:**

```text
/annotate:md README.md
/annotate:image ./mockup.png
/annotate:review ./anything      # auto-detects image vs. markdown
```

**OpenCode:**

```text
/annotate:md README.md
```

or the tool directly: `annotate_markdown({ filePath: "/path/to/file.md" })`.

**Mistral Vibe:**

```text
/annotate README.md
```

**Standalone CLI**, mode auto-detected from the target:

```bash
annotaitr README.md               # markdown
annotaitr ./mockup.png            # image, local file
annotaitr http://localhost:3000   # image, capture
```

Full flag and environment variable reference: [docs/usage.md](docs/usage.md).

## 🏗️ Architecture

```text
index.js                # CLI entry: parse argv, detect mode, dispatch
server/
├── core/                 # shared Express bootstrap, config, browser, lifecycle
├── image/                # image mode: capture, render, feedback
└── markdown/              # markdown mode: file/notes handling, feedback
client/
├── image/                # image client, its own single-file build
└── markdown/               # markdown client, its own single-file build
apps/
├── claude-code/           # plugin: /annotate:md, /annotate:image, /annotate:review
├── opencode/              # OpenCode plugin (markdown only)
└── vibe/                  # Mistral Vibe skill (markdown only)
```

## 📚 Documentation

| Topic | What's inside |
|-------|----------------|
| [Usage](docs/usage.md) | Every flag, environment variable, exit code, and the mode-detection rules |
| [How annotaitr works](docs/how-it-works.md) | The annotation and review-loop mechanism behind each mode |
| [Migration](docs/migration.md) | Upgrading from `md-annotator` or `img-annotator` |
| [Development](docs/development.md) | Local setup, build commands, plugin testing |
| [Release process](docs/release.md) | Version bump and tag checklist (maintainers) |

## 🧑‍💻 Contributing

Please have a look at [`CONTRIBUTING.md`](CONTRIBUTING.md).

## 💎 Credits

Heavily inspired by [plannotator](https://plannotator.ai/), which pioneered
this general browser-markup-and-feedback approach for reviewing planning
documents; annotaitr applies it to images, captured web pages, and
Markdown/plain-text files.

## ⭐ License

This project is licensed under [MIT](LICENSE).
