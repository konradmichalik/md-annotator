---
description: Open a Markdown file in the browser-based annotator for review
allowed-tools: Bash(md-annotator *), Read, Edit
args: files
---

## Markdown Annotations

!`md-annotator --origin claude-code $ARGUMENTS`

## Your task

Address the annotation feedback above. The user has reviewed the markdown file in the browser UI and provided specific annotations:

- **"Remove this"** entries: Delete the quoted text from the file
- **"Comment on"** entries: Apply the user's comment as a change to the referenced text
- **"Insert text"** entries: Insert the provided text at the specified location

If the output shows `APPROVED:`, the user approved the file with no changes needed — confirm and stop.

## Re-review loop

After applying all changes:

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
