---
description: Annotate a markdown file in the browser
---

Use the `annotate_markdown` tool to open the specified file for interactive review.

If a file path is provided as an argument, use that file.
Otherwise, ask the user which markdown file they want to annotate.

The user can:
- Select text and mark it for deletion
- Select text and add comments
- Insert text at specific locations
- Approve the file with no changes

After the user submits their decision:
- If approved: No action needed
- If feedback provided: Apply the requested changes to the file

## Re-review loop

Unless the user specified `--no-review`, after applying changes:

1. Create feedback notes describing what you changed:
   - Use `feedbackNotes` parameter with `[{text, line?}]` entries
   - Include `line` for location-specific notes (use line numbers from the **updated** file)
   - Omit `line` for general notes

2. Re-open the annotator with notes:
   ```
   annotate_markdown({ filePath: "...", feedbackNotes: [{text: "Changed X", line: 5}] })
   ```

3. If approved → done. If more feedback → apply and repeat.
