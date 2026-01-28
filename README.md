# 📝 md-annotator

Browser-based Markdown annotator with text highlighting. Select text to mark it for deletion or add comments.

## 🔌 Claude Code Plugin

md-annotator is a Claude Code plugin. After installation the slash command `/md-annotator:annotate` is available in any Claude Code session.

### 📦 Installation

```bash
# Build the client first
cd /path/to/markdown-annotator
npm install && npm run build

# Install as Claude Code plugin
claude plugin install /path/to/markdown-annotator --scope user
```

### 🚀 Usage

Inside a Claude Code session:

```
/md-annotator:annotate README.md
```

This opens the file in your browser. You can then:

- **Select text** to see the annotation toolbar
- **Delete** — marks text as struck-through (red)
- **Comment** — highlights text (yellow) and adds a comment
- **View annotations** in the sidebar panel on the right
- **Shutdown** via the button in the header when done

If no file argument is given, the command looks for `plan.md` in the current directory.

### 🧪 Testing without installation

```bash
claude --plugin-dir /path/to/markdown-annotator
```

Then use `/md-annotator:annotate <file>` in the session.

## 💻 Standalone CLI

md-annotator also works as a standalone CLI tool without Claude Code:

```bash
# Run directly
node index.js README.md

# Or link globally
npm link
md-annotator README.md

# Show help
md-annotator --help
```

The server starts on an available port (default 3000) and opens your browser automatically. Press Ctrl+C or click "Shutdown" in the browser to stop.

## 🛠️ Development

```bash
npm run dev:client   # Vite dev server with HMR (client only)
npm run build        # Production build (single-file HTML)
npm run dev          # CLI with --watch
```

## 📁 Project Structure

```
markdown-annotator/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── commands/
│   └── annotate.md          # /md-annotator:annotate slash command
├── client/
│   ├── index.html           # Vite entry
│   ├── src/
│   │   ├── main.jsx         # React mount
│   │   ├── App.jsx          # Main app (state, layout, API)
│   │   ├── parser.js        # Markdown-to-blocks parser
│   │   ├── Viewer.jsx       # Rendered markdown + web-highlighter
│   │   ├── Toolbar.jsx      # Floating annotation toolbar
│   │   ├── AnnotationPanel.jsx  # Sidebar with annotation list
│   │   └── styles.css       # All styles (dark/light mode)
│   └── dist/                # Build output (gitignored)
├── server/
│   ├── index.js             # Express server + lifecycle
│   ├── routes.js            # API routes
│   └── utils.js             # File I/O helpers
├── index.js                 # CLI entry point
├── vite.config.js           # Vite + React + singlefile
└── package.json
```

## 🔗 API

The local Express server exposes these endpoints. The browser client uses them internally — you only need them if you want to build a custom frontend or integrate md-annotator into another tool.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/file` | Read the markdown file |
| POST | `/api/save` | Write content to file |
| POST | `/api/shutdown` | Stop the server |
| GET | `/health` | Health check |

## 📄 License

MIT
