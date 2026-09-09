# Migrating from md-annotator or img-annotator

`annotaitr` is the merge of `img-annotator` and `md-annotator` (this repo,
formerly `konradmichalik/md-annotator`) into one package and one plugin,
auto-detecting which mode to run from the target. Nothing below is required
to keep working today — the old names and variables still function, with a
deprecation warning — but plan to move off them before the next major
version.

## Claude Code

The marketplace was renamed. Remove the old one and add the new one:

```bash
claude plugin marketplace remove md-annotator   # or img-annotator
claude plugin marketplace add konradmichalik/annotaitr
claude plugin install annotate@annotaitr
```

The plugin itself is still named `annotate`, so `/annotate:md` keeps
working unchanged. `/annotate:image` and `/annotate:review` are new.

## CLI

```bash
npm install -g annotaitr
```

`md-annotator` keeps working as a `bin` alias for existing scripts and
shell aliases; `img-annotator` was never published, so there's no alias for
it.

## Environment variables

`MD_ANNOTATOR_*` and `IMG_ANNOTATOR_*` still work, with a one-time
deprecation warning on stderr, under the merged `ANNOTAITR_*` prefix. See
the full list in [Usage](usage.md#environment-variables).

## Signal handling

Interrupting a markdown-mode session (`Ctrl+C`) now reports `{ aborted: true
}` to the calling agent instead of the previous `{ approved: true }`, so an
interrupt is no longer indistinguishable from a real approval.

## OpenCode and Vibe

`md-annotator-opencode` is now `annotaitr-opencode`; the Vibe skill
directory is now `apps/vibe/skills/annotate`. Both stay markdown-only for
now — image support in either is tracked as a follow-up, not yet available.
