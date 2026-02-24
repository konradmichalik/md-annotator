# User Guide

Getting started with md-annotator.

Back to [Main Document](../main.md) | See also [API Reference](./api.md)

## Installation

```bash
npm install
npm run build
```

## Single File Usage

```bash
md-annotator README.md
```

## Multi-File Usage

Open multiple files at once:

```bash
md-annotator docs/api.md docs/guide.md
```

A **tab bar** appears at the top for switching between files. Each tab shows:
- The filename
- An annotation count badge (if annotations exist)

## Linked Navigation

When a document contains relative markdown links like `[API Docs](./api.md)`, clicking them opens the linked file as a new tab instead of navigating away.

### How It Works

1. Click a relative `.md` link in the viewer
2. The file loads as a new tab
3. Click the same link again — switches to the existing tab (deduplication)

### Supported Link Formats

- `[text](./file.md)` - Relative to current file
- `[text](../parent.md)` - Parent directory
- `[text](subdir/file.md)` - Subdirectory

### Not Intercepted

These links behave normally (open in new browser tab):
- `[text](https://example.com)` - Absolute URLs
- `[text](./image.png)` - Non-markdown files
- `[text](#heading)` - Anchor links (scroll within page)

## Annotation Workflow

1. **Select text** in the viewer
2. Press `Cmd+D` to mark as deletion, or `Cmd+K` to add a comment
3. Review annotations in the sidebar
4. **Submit Feedback** sends all annotations (across all files) to the agent
5. **Approve** confirms the file(s) as-is (only available when no annotations exist)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+D`  | Mark selection as deletion |
| `Cmd+K`  | Add comment to selection |
| `Cmd+Z`  | Undo last annotation |
| `Cmd+Shift+Z` | Redo annotation |
| `Escape` | Close toolbar |
