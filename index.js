#!/usr/bin/env node

import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { createServer } from './server/index.js'
import { isMarkdownFile, fileExists } from './server/file.js'
import { openBrowser } from './server/browser.js'

const HELP_TEXT = `
md-annotator — Annotate Markdown files in the browser

Usage:
  md-annotator [options] <file.md> [file2.md ...]

Options:
  --help                       Show this help message
  --origin <name>              Set caller origin (cli, claude-code, opencode)
  --feedback-notes <json|path> AI notes to display as read-only annotations

Environment:
  MD_ANNOTATOR_PORT      Base port (default: 3000)
  MD_ANNOTATOR_BROWSER   Custom browser app name
  MD_ANNOTATOR_TIMEOUT   Heartbeat timeout in ms (default: 30000, range: 5000–300000)

Examples:
  md-annotator README.md
  md-annotator docs/api.md docs/guide.md
  md-annotator --feedback-notes '[{"text":"Rewrote intro","line":5}]' README.md
  md-annotator --feedback-notes notes.json README.md
`.trim()

function parseFeedbackNotes(value) {
  const trimmed = value.trim()
  let parsed
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    parsed = JSON.parse(trimmed)
  } else {
    // Treat as file path
    const content = readFileSync(resolve(value), 'utf-8')
    parsed = JSON.parse(content)
  }
  if (!Array.isArray(parsed) && (typeof parsed !== 'object' || parsed === null)) {
    throw new Error('Expected a JSON array or object')
  }
  return parsed
}

function parseArgs(argv) {
  const args = argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    return { help: true }
  }

  const validOrigins = ['cli', 'claude-code', 'opencode']
  let origin = 'cli'
  let feedbackNotes = null
  const filePaths = []

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--origin') {
      if (!args[i + 1] || args[i + 1].startsWith('-')) {
        return { error: '--origin requires a value (cli, claude-code, opencode)' }
      }
      origin = args[i + 1]
      i++
    } else if (args[i] === '--feedback-notes') {
      if (!args[i + 1]) {
        return { error: '--feedback-notes requires a JSON string or file path' }
      }
      const value = args[i + 1]
      i++
      try {
        feedbackNotes = parseFeedbackNotes(value)
      } catch (err) {
        return { error: `--feedback-notes: ${err.message}` }
      }
    } else if (!args[i].startsWith('-')) {
      filePaths.push(args[i])
    } else {
      return { error: `Unknown option: ${args[i]}` }
    }
  }

  if (!validOrigins.includes(origin)) {
    return { error: `Unknown origin "${origin}". Valid: ${validOrigins.join(', ')}` }
  }

  return { filePaths, origin, feedbackNotes }
}

async function main() {
  const { help, filePaths, origin, feedbackNotes, error } = parseArgs(process.argv)

  if (error) {
    process.stderr.write(`Error: ${error}\n\n`)
    process.stderr.write(HELP_TEXT + '\n')
    process.exit(1)
  }

  if (help) {
    process.stderr.write(HELP_TEXT + '\n')
    process.exit(0)
  }

  if (!filePaths || filePaths.length === 0) {
    process.stderr.write('Error: No file specified.\n\n')
    process.stderr.write(HELP_TEXT + '\n')
    process.exit(1)
  }

  const absolutePaths = []
  for (const fp of filePaths) {
    const abs = resolve(fp)
    if (!isMarkdownFile(abs)) {
      process.stderr.write(`Error: Not a Markdown file: ${fp}\n`)
      process.exit(1)
    }
    if (!(await fileExists(abs))) {
      process.stderr.write(`Error: File not found: ${abs}\n`)
      process.exit(1)
    }
    absolutePaths.push(abs)
  }

  const server = await createServer(absolutePaths, origin, { feedbackNotes })
  const url = `http://localhost:${server.port}`

  process.stderr.write(`Server running at ${url}\n`)
  process.stderr.write(`Annotating: ${absolutePaths.join(', ')}\n`)

  await openBrowser(url)

  // Block until user clicks Approve or Submit Feedback (or browser disconnects)
  const decision = await server.waitForDecision()

  // Handle browser disconnect (no need to wait for browser)
  if (decision.disconnected) {
    process.stderr.write('Browser tab closed — no decision made.\n')
    server.shutdown()
    process.exit(1)
  }

  // Give browser time to receive response
  await new Promise(r => setTimeout(r, 500))

  // Log decision to stderr
  if (decision.approved) {
    process.stderr.write('Decision: Approved (no changes)\n')
  } else {
    process.stderr.write(`Decision: Feedback with ${decision.annotationCount} annotation(s)\n`)
  }

  // Output feedback to stdout — this is what Claude reads
  const output = decision.approved
    ? 'APPROVED: No changes requested.\n'
    : decision.feedback + '\n'

  process.stdout.write(output, () => {
    server.shutdown()
    process.exit(0)
  })
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n`)
  process.exit(1)
})
