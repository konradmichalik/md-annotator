#!/usr/bin/env node

import { resolve } from 'node:path'
import { createServer } from './server/index.js'
import { isMarkdownFile, fileExists } from './server/file.js'
import { openBrowser } from './server/browser.js'

const HELP_TEXT = `
md-annotator — Annotate Markdown files in the browser

Usage:
  md-annotator <file.md>

Options:
  --help    Show this help message

Environment:
  MD_ANNOTATOR_PORT      Base port (default: 3000)
  MD_ANNOTATOR_BROWSER   Custom browser app name

Examples:
  md-annotator README.md
  md-annotator docs/notes.md
`.trim()

function parseArgs(argv) {
  const args = argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    return { help: true }
  }

  return { filePath: args[0] }
}

async function main() {
  const { help, filePath } = parseArgs(process.argv)

  if (help) {
    process.stderr.write(HELP_TEXT + '\n')
    process.exit(0)
  }

  if (!filePath) {
    process.stderr.write('Error: No file specified.\n\n')
    process.stderr.write(HELP_TEXT + '\n')
    process.exit(1)
  }

  const absolutePath = resolve(filePath)

  if (!isMarkdownFile(absolutePath)) {
    process.stderr.write(`Error: Not a Markdown file: ${filePath}\n`)
    process.exit(1)
  }

  if (!(await fileExists(absolutePath))) {
    process.stderr.write(`Error: File not found: ${absolutePath}\n`)
    process.exit(1)
  }

  const server = await createServer(absolutePath)
  const url = `http://localhost:${server.port}`

  process.stderr.write(`Server running at ${url}\n`)
  process.stderr.write(`Annotating: ${absolutePath}\n`)

  await openBrowser(url)

  // Block until user clicks Approve or Submit Feedback
  const decision = await server.waitForDecision()

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
