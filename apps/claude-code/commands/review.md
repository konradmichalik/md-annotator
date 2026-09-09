---
description: Open a target in the browser-based annotator, auto-detecting whether it's an image or a Markdown/plain-text file
allowed-tools: Bash(annotaitr *), Read, Edit
args: target
---

## Annotations

!`annotaitr --origin claude-code $ARGUMENTS`

Use this command when you don't know in advance whether `$ARGUMENTS` is an
image target or a markdown target — `annotaitr` auto-detects it (see `--help`
for the exact rules) and the output above will be in one of two shapes:

**Image feedback** — recognizable by an `Annotated screenshot:` path near the
top. The user marked up an image or captured web page: boxes, arrows,
freehand marks, and numbered comment pins, each with an optional comment.
Read the annotated image directly to see exactly what was marked and where;
combine that with each annotation's coarse position and comment text to find
the relevant source and apply the requested change.

**Markdown feedback** — a `# Annotation Feedback` document (or `APPROVED:` /
`APPROVED WITH NOTES:` with no such document) with one block per annotation,
each giving a line reference and the requested change:

- **"Remove this"** entries: delete the quoted text
- **"Comment on"** entries: apply the comment as a change to the referenced text
- **"Insert text"** entries: insert the given text at the specified location

In both shapes: if the output shows `APPROVED:`, the target was approved with
no changes needed — confirm and stop. If it shows `APPROVED WITH NOTES:`, it
was approved as-is but carries annotations; do **not** make changes, read the
notes as context, and stop.

## Re-review loop

After applying all changes, re-open the annotator on the same target (for
markdown, add `--feedback-notes` describing what changed, as in
`/annotate:md`; for an image or URL, just re-run) and repeat until
`APPROVED:` or `APPROVED WITH NOTES:`.
