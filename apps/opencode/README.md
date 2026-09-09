# annotaitr-opencode

OpenCode plugin for interactive markdown annotation. Image mode is not
exposed here yet — this plugin covers markdown only, see the `annotaitr`
CLI directly for images and captured web pages.

## Installation

Add to your `opencode.json`:

```json
{
  "plugins": ["annotaitr-opencode"]
}
```

## Usage

### Tool

The agent can call `annotate_markdown` with a file path:

```
annotate_markdown({ filePath: "/path/to/file.md" })
```

### Command

Use `/annotate:md <file>` in the chat to trigger annotation.

## What Users Can Do

- **Select text** to highlight portions of the document
- **Mark for deletion** - indicate text that should be removed
- **Add comments** - provide feedback on specific sections
- **Approve** - confirm the document needs no changes

## Environment Variables
| Variable | Description |
|----------|-------------|
| `ANNOTAITR_PORT` | Port or inclusive range (`3000` or `3000-3010`); the first free port in the range wins |
| `ANNOTAITR_BROWSER` | Custom browser application |

(`MD_ANNOTATOR_*` still works as a deprecated fallback.)

## Output

The tool returns either:
- `APPROVED: No changes requested.` - User approved the file
- `APPROVED WITH NOTES: <n> notes.` - User approved the file as-is and left annotations as context (do not edit)
- Structured markdown feedback with annotations for the agent to apply
