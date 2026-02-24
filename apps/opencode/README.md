# @md-annotator/opencode

OpenCode plugin for interactive markdown annotation.

## Installation

Add to your `opencode.json`:

```json
{
  "plugins": ["@md-annotator/opencode"]
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
| `MD_ANNOTATOR_PORT` | Override the server port (default: 3000) |
| `MD_ANNOTATOR_BROWSER` | Custom browser application |

## Output

The tool returns either:
- `APPROVED: No changes requested.` - User approved the file
- Structured markdown feedback with annotations for the agent to apply
