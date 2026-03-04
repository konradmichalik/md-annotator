#!/bin/bash
set -e

REPO="konradmichalik/md-annotator"
PACKAGE_NAME="md-annotator-opencode"

echo "md-annotator — OpenCode Plugin Installer"
echo ""

# Install OpenCode slash command
OPENCODE_COMMANDS_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode/command"
mkdir -p "$OPENCODE_COMMANDS_DIR"

cat > "$OPENCODE_COMMANDS_DIR/annotate:md.md" << 'COMMAND_EOF'
---
description: Annotate a markdown file in the browser
---

Use the `annotate_markdown` tool to open the specified file for interactive review.

**Arguments:** $ARGUMENTS

If arguments contain file path(s), use those files.
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
COMMAND_EOF

echo "Installed /annotate:md command to ${OPENCODE_COMMANDS_DIR}/annotate:md.md"

# Clear cached OpenCode plugin to force fresh download on next run
rm -rf "$HOME/.cache/opencode/node_modules/@md-annotator" "$HOME/.cache/opencode/node_modules/md-annotator-opencode" 2>/dev/null || true
rm -rf "$HOME/.bun/install/cache/@md-annotator" "$HOME/.bun/install/cache/md-annotator-opencode" 2>/dev/null || true
echo "Cleared OpenCode plugin cache"

echo ""
echo "=========================================="
echo "  OPENCODE SETUP"
echo "=========================================="
echo ""
echo "Add the plugin to your opencode.json:"
echo ""
echo "  \"plugin\": [\"${PACKAGE_NAME}@latest\"]"
echo ""
echo "Then restart OpenCode. The /annotate:md command is ready!"
echo ""
echo "=========================================="
echo "  CLAUDE CODE SETUP"
echo "=========================================="
echo ""

npm install -g md-annotator@latest
echo "Installed md-annotator CLI globally"

if command -v claude &> /dev/null; then
  claude plugin marketplace update md-annotator 2>/dev/null && \
    claude plugin update annotate@md-annotator 2>/dev/null && \
    echo "Updated Claude Code plugin" || \
    echo "Claude Code plugin not yet installed. Run: claude plugin marketplace add konradmichalik/md-annotator"
else
  echo "Claude Code CLI not found. Install it first, then run:"
  echo "  claude plugin marketplace add konradmichalik/md-annotator"
fi
