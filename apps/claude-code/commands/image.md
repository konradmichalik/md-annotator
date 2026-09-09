---
description: Open an image file or a captured web page in the browser-based annotator for visual review
allowed-tools: Bash(annotaitr *), Read, Edit
args: target
---

## Image Annotations

!`annotaitr --origin claude-code $ARGUMENTS`

If no target is given, this reads the current image from the macOS clipboard
(the same source a pasted screenshot would use), so `/annotaitr:image` alone
works after copying a screenshot without needing to save it to a file first.

## Your task

Address the annotation feedback above. The user marked up an image in the
browser UI: boxes, arrows, freehand marks, and numbered comment pins, each
with an optional text comment.

- The output includes a path to an **annotated image** (the original
  image with the markup baked in as pixels). Read that image directly to
  see exactly what was marked and where.
- Each annotation lists its type, a coarse position (e.g. "top right, ~15%
  from top, ~85% from left"), and its comment text.
- Combine what you see in the image with the comment text and position to
  find the relevant source (search the repo for matching visible text, class
  names, or component structure) and apply the requested change.

If the output shows `APPROVED:`, the user approved the page with no changes
needed: confirm and stop.

If the output shows `APPROVED WITH NOTES:`, the user approved the page as-is
but left annotations. Do **not** make changes. Read the notes, acknowledge
them, and stop. They are context for your understanding, not change
requests.

## Re-review loop

After applying all changes, re-open the annotator on the same target (a URL
re-captures live; a file path re-loads the same image) to confirm the fix
looks right, then repeat until `APPROVED:` or `APPROVED WITH NOTES:`.
