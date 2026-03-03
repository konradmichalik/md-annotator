# Development

## Getting Started

```bash
git clone https://github.com/konradmichalik/md-annotator.git
cd md-annotator
npm install && npm run build
```

## Commands

```bash
npm run dev:client   # Vite dev server with HMR (client only)
npm run build        # Production build (single-file HTML)
npm run dev          # CLI with --watch
```

## Claude Code Plugin Testing

```bash
# Install local plugin
claude plugin install ./apps/claude-code --scope user

# Test plugin without permanent installation
claude --plugin-dir ./apps/claude-code
```

## OpenCode Plugin Testing

The OpenCode plugin bundles the entire server + client into a single file via tsup. To test locally:

### 1. Build everything

```bash
npm run build

cd apps/opencode
npm install
npm run build
cd ../..
```

This builds the client SPA first (`client/dist/index.html`), then the OpenCode plugin copies it as `annotator.html` and bundles the server code into `apps/opencode/dist/index.js`.

### 2. Link the CLI globally

```bash
npm link
```

The plugin uses the `md-annotator` CLI as a fallback, so it needs to be available in `PATH`.

### 3. Configure OpenCode to use the local plugin

Create or edit `opencode.json` in the project root:

```json
{
  "plugin": ["./apps/opencode"]
}
```

### 4. Install the slash command

```bash
cp apps/opencode/commands/*.md ${XDG_CONFIG_HOME:-$HOME/.config}/opencode/command/
```

This registers the `/annotate:md` command for the OpenCode session.

### 5. Run OpenCode

Start OpenCode from the project root. The local plugin provides the `annotate_markdown` tool and the `/annotate:md` slash command.

### Rebuild after changes

After changes to the client, server, or plugin source:

```bash
npm run build && cd apps/opencode && npm run build && cd ../..
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MD_ANNOTATOR_PORT` | Override the server port (default: 3000) |
| `MD_ANNOTATOR_BROWSER` | Custom browser application |
| `MD_ANNOTATOR_TIMEOUT` | Heartbeat timeout in ms (default: 30000, range: 5000–300000) |
| `MD_ANNOTATOR_FEEDBACK_NOTES` | JSON string or file path for feedback notes |
