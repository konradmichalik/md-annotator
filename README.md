<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/images/logo-light.png">
    <img alt="md-annotator" src="docs/images/logo-light.png" width="400">
  </picture>
</p>

<p align="center">
  An AI coding agent plugin that opens Markdown files in a local browser-based annotator.<br>
  Select text to mark deletions or add comments, then let the coding agent apply your feedback.
</p>

> [!NOTE]
> This plugin is heavily inspired by the excellent [plannotator](https://plannotator.ai/) plugin and uses a similar general approach for Markdown files. Useful for reviewing documentation in software projects.

![md-annotator](docs/images/screenshot.jpg)

## ✨ Features

- **Multi-File Support** -- Review multiple files in one session with a tabbed interface
- **Linked Navigation** -- Click relative `.md` links to open them as new tabs (wiki-style browsing)
- **Mermaid Diagrams** -- Renders `mermaid` code blocks as interactive diagrams with zoom, pan, and source toggle (adapts to light/dark theme)
- **Export & Import** -- Export annotations as Markdown or JSON; re-import JSON to continue a review later
- **Annotation Persistence** -- Annotations auto-save to the server and survive page reloads (validated by content hash)
- **Undo / Redo** -- Full undo/redo history for annotations (`Cmd+Z` / `Cmd+Shift+Z`)
- **Inline Editing** -- Click highlighted text to edit annotation type or comment in-place
- **Table of Contents** -- Collapsible sidebar with scroll tracking and per-section annotation count badges
- **Syntax Highlighting** -- Code blocks rendered with highlight.js
- **Dark Mode** -- Light, dark, and auto theme (follows system preference)
- **Auto-Close Tab** -- Opt-in countdown that closes the browser tab after submitting feedback
- **Update Notifications** -- Banner when a new GitHub release is available
- **Heartbeat Detection** -- Graceful shutdown when the browser tab is closed
- **IDE Integration** -- Annotate the currently open file in VSCode, Cursor, or JetBrains without arguments

## Prerequisites

- **Node.js** 22+ and **npm**
- A modern **browser** (opens automatically)

## 🔌 Claude Code Plugin

*md-annotator* is a Claude Code plugin. After installation the slash command `/annotate:md` is available in any Claude Code session.

### 📦 Installation

```bash
# Add the marketplace
claude plugin marketplace add konradmichalik/md-annotator

# Install the plugin
claude plugin install annotate@md-annotator --scope user
```

For local development, see the [Development](#development) section.

### 🔄 Update

```bash
claude plugin update annotate@md-annotator
```

### 🚀 Usage

Inside a Claude Code session:

```
/annotate:md README.md
/annotate:md docs/api.md docs/guide.md
```

Or, with IDE integration (VSCode/Cursor/JetBrains), just run without arguments to annotate the currently open file:

```
/annotate:md
```

This opens the file in your browser. You can then:

- **Select text** to see the annotation toolbar
- **Delete** -- marks text as struck-through (red)
- **Comment** -- highlights text (yellow) and adds a comment
- **Insert** -- place the cursor to add new text at that position
- **Global Comment** -- add general feedback via the "+" button in the annotation panel
- **Annotate images & diagrams** -- click on images or Mermaid diagrams to comment or delete them
- **View annotations** in the sidebar panel on the right
- **Export** annotations as Markdown or JSON
- **Approve** or **Submit Feedback** when done

## 🔷 OpenCode Plugin

*md-annotator* is also available as an OpenCode plugin.

### 📦 Installation

Add to your `opencode.json`:

```json
{
  "plugins": ["@md-annotator/opencode"]
}
```

### 🚀 Usage

The agent can use the `annotate_markdown` tool:

```
annotate_markdown({ filePath: "/path/to/file.md" })
annotate_markdown({ filePaths: ["/path/to/a.md", "/path/to/b.md"] })
```

Or use the `/annotate:md` command in the chat.

## 💻 Standalone CLI

*md-annotator* also works as a standalone CLI tool without an AI coding agent:

```bash
# Single file
md-annotator README.md

# Multiple files (opens with tab bar)
md-annotator docs/api.md docs/guide.md

# Or link globally first
npm link

# Show help
md-annotator --help
```

The server starts on an available port (default 3000) and opens your browser automatically. When reviewing multiple files, a tab bar appears for switching between them. Clicking relative `.md` links inside a document opens the linked file as a new tab.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `MD_ANNOTATOR_PORT` | Override the server port (default: 3000) |
| `MD_ANNOTATOR_BROWSER` | Custom browser application |

## 🛠️ Development

```bash
# Clone and build
git clone https://github.com/konradmichalik/md-annotator.git
cd md-annotator
npm install && npm run build

# Install local plugin for testing
claude plugin install ./apps/claude-code --scope user

# Development commands
npm run dev:client   # Vite dev server with HMR (client only)
npm run build        # Production build (single-file HTML)
npm run dev          # CLI with --watch

# Test plugin without permanent installation
claude --plugin-dir ./apps/claude-code
```

## 📄 License

MIT
