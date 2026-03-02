# Release Process

## Overview

Releases follow a manual version bump + tag push workflow. A GitHub Actions workflow automatically creates the GitHub Release with auto-generated release notes when a tag is pushed.

## Steps

### 1. Determine version number

Follow [Semantic Versioning](https://semver.org/):

- **patch** (0.x.Y) — bug fixes only
- **minor** (0.Y.0) — new features, non-breaking changes
- **major** (Y.0.0) — breaking changes

### 2. Bump version in all three files

All versions must stay in sync:

| File | Field |
|------|-------|
| `package.json` | `version` |
| `apps/claude-code/.claude-plugin/plugin.json` | `version` |
| `apps/opencode/package.json` | `version` |

### 3. Commit

```bash
git add package.json apps/claude-code/.claude-plugin/plugin.json apps/opencode/package.json
git commit -m "release: version X.Y.Z"
```

### 4. Tag and push

```bash
git tag X.Y.Z
git push origin main --tags
```

The tag format must be `X.Y.Z` (no `v` prefix). The release workflow validates this pattern.

### 5. GitHub Release (automatic)

The `.github/workflows/release.yml` workflow triggers on any tag push and:

1. Validates the tag matches `X.Y.Z` format
2. Creates a GitHub Release via `softprops/action-gh-release`
3. Auto-generates release notes from merged PRs since the last tag

### 6. Verify

```bash
gh release view X.Y.Z
```

## Checklist

- [ ] All changes merged to `main`
- [ ] Tests pass (`npm test`)
- [ ] Version bumped in all three files
- [ ] Commit message: `release: version X.Y.Z`
- [ ] Tag format: `X.Y.Z` (no `v` prefix)
- [ ] Tag pushed, GitHub Release created automatically
