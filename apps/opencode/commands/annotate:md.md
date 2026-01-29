---
description: Annotate a markdown file in the browser
---

Use the `annotate_markdown` tool to open the specified file for interactive review.

If a file path is provided as an argument, use that file.
Otherwise, ask the user which markdown file they want to annotate.

The user can:
- Select text and mark it for deletion
- Select text and add comments
- Approve the file with no changes

After the user submits their decision:
- If approved: No action needed
- If feedback provided: Apply the requested changes to the file
