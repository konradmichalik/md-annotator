---
description: Open a Markdown file in the browser-based annotator for review
allowed-tools: Bash, Read, Edit, Glob
---

# Annotate Markdown File

The user wants to open a Markdown file in the browser-based md-annotator for review and annotation.

## Instructions

1. Determine which file to annotate:
   - If the user provided a file path as argument (e.g. `/md-annotator:annotate README.md`), use that path.
   - If no argument was given, look for a `plan.md` in the current working directory. If it doesn't exist, ask the user which Markdown file to open.

2. Verify the file exists and has a `.md` or `.markdown` extension. If not, inform the user.

3. Tell the user that the annotator is opening in their browser and that they should click "Approve" or "Submit Feedback" when done.

4. Run the annotator using the Bash tool with these EXACT parameters:
   - command: `node ${CLAUDE_PLUGIN_ROOT}/index.js <absolute-filepath>`
   - timeout: 600000
   - CRITICAL: Do NOT set `run_in_background`. This MUST be a foreground/blocking call. The process will exit on its own when the user clicks a button in the browser. You MUST wait for it to complete.

5. Once the Bash command completes, examine the stdout output:
   - If stdout starts with `APPROVED:` — the user approved the file with no changes needed. Confirm this to the user and stop.
   - Otherwise, stdout contains **Markdown-formatted annotation feedback**. Each annotation is either:
     - **"Remove this"** with a code block: Delete that exact text from the file.
     - **"Comment on"** with a quote: Apply the user's comment as a change to the referenced text.
   Read the file, apply all requested changes using the Edit tool, and show the user a summary of what was changed.
