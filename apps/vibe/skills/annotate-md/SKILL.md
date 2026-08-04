---
name: annotate-md
description: Open Markdown file(s) in the browser-based md-annotator for interactive review, then apply the user's annotation feedback.
user-invocable: true
---

# Annotate Markdown

Open one or more Markdown files in the md-annotator browser UI so the user can
review them — selecting text to mark deletions, adding comments, or inserting
text — then apply the feedback they submit.

**Arguments:** `$ARGUMENTS`

If the arguments contain Markdown file path(s), use those. Otherwise, ask the
user which Markdown file they want to annotate.

## Run the annotator

Run the `md-annotator` CLI with your shell tool, passing `--origin vibe` and the
file path(s). This command **blocks** until the user submits a decision in the
browser:

```bash
md-annotator --origin vibe <file1.md> [file2.md ...]
```

The command prints the result to stdout:

- `APPROVED:` → the user approved the file with no changes. Confirm and stop.
- `APPROVED WITH NOTES:` → the user approved the file as-is but left annotations.
  Do **not** edit the file; read the notes as context, acknowledge them, and stop.
- Structured annotation feedback → apply the requested edits to the file(s):
  - **"Remove this"** entries: delete the quoted text.
  - **"Comment on"** entries: apply the user's comment as a change to the referenced text.
  - **"Insert text"** entries: insert the provided text at the specified location.

> Requires the `md-annotator` CLI on your `PATH` (`npm install -g md-annotator`,
> or `npm link` from a local checkout).

## Re-review loop

Unless the user said otherwise, after applying all changes:

1. **Build feedback notes** describing what you changed — a JSON array of
   `{ "text": "...", "line": <number> }` entries. `line` is the line number in
   the **updated** file; omit it for general notes.

2. **Re-open the annotator** with the notes so the user sees what changed:

   ```bash
   md-annotator --origin vibe --feedback-notes '[{"text":"Rewrote intro for clarity","line":5},{"text":"Removed redundant section"}]' <file1.md> [file2.md ...]
   ```

3. **Evaluate the result:**
   - `APPROVED:` → the user is satisfied. Done.
   - `APPROVED WITH NOTES:` → the user is satisfied. Summarize the notes without editing. Done.
   - More feedback → apply the changes and repeat from step 1.
