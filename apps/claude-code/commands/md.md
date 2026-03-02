---
description: Open a Markdown file in the browser-based annotator for review
allowed-tools: Bash(md-annotator *), Read, Edit, mcp__ide__getDiagnostics
args: files
---

## Determine the file(s) to annotate

1. If `$ARGUMENTS` contains file path(s), use those files.
2. Otherwise, call `mcp__ide__getDiagnostics` to get the currently open file from the IDE:
   - Extract the file path from the `uri` field (remove `file://` prefix)
   - Only use `.md` files; if no markdown file is open, ask the user to specify one
3. Check if `$ARGUMENTS` contains `--no-review` — if so, skip the re-review loop (single-pass mode).

## Run the annotator

```bash
md-annotator --origin claude-code <file1.md> [file2.md ...]
```

Replace `<file1.md> [file2.md ...]` with the determined file path(s).

## Apply feedback

Address the annotation feedback. The user has reviewed the Markdown file in the browser UI and provided specific annotations:

- **"Remove this"** entries: Delete the quoted text from the file
- **"Comment on"** entries: Apply the user's comment as a change to the referenced text
- **"Insert text"** entries: Insert the provided text at the specified location

If the output shows `APPROVED:`, the user approved the file with no changes needed — confirm and stop.

## Re-review loop

Unless `--no-review` was specified, after applying all changes:

1. **Build feedback notes JSON** describing what you changed. Each note has a `text` field and an optional `line` field (line number in the **updated** file). Omit `line` for general notes.

2. **Re-open the annotator** with inline notes:
   ```bash
   md-annotator --origin claude-code --feedback-notes '<JSON_ARRAY>' <file1.md> [file2.md ...]
   ```
   Example:
   ```bash
   md-annotator --origin claude-code --feedback-notes '[{"text":"Rewrote intro for clarity","line":5},{"text":"Removed redundant section"}]' README.md
   ```

3. **Evaluate the result:**
   - `APPROVED:` → The user is satisfied. Done.
   - More feedback → Apply changes and repeat from step 1.
