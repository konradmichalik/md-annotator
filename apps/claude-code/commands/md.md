---
description: Open a Markdown file in the browser-based annotator for review
allowed-tools: Bash(md-annotator *), Read, Edit, mcp__ide__getDiagnostics
args: file
---

## Determine the file to annotate

1. If `$ARGUMENTS` contains a file path, use that file.
2. Otherwise, call `mcp__ide__getDiagnostics` to get the currently open file from the IDE:
   - Extract the file path from the `uri` field (remove `file://` prefix)
   - Only use `.md` files; if no markdown file is open, ask the user to specify one

## Run the annotator

```bash
md-annotator --origin claude-code <file>
```

Replace `<file>` with the determined file path.

## Your task

Address the annotation feedback above. The user has reviewed the Markdown file in the browser UI and provided specific annotations:

- **"Remove this"** entries: Delete the quoted text from the file
- **"Comment on"** entries: Apply the user's comment as a change to the referenced text

If the output shows `APPROVED:`, the user approved the file with no changes needed - confirm and stop.
