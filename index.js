#!/usr/bin/env node

import { resolve } from 'node:path'
import { startServer } from './server/index.js'
import { isMarkdownFile, fileExists } from './server/utils.js'
import open from 'open'

const HELP_TEXT = `
md-annotator — Annotate Markdown files in the browser

Usage:
  md-annotator <file.md>

Options:
  --help    Show this help message

Examples:
  md-annotator README.md
  md-annotator docs/notes.md
`.trim()

function parseArgs(argv) {
  const args = argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    return { help: true }
  }

  const filePath = args[0]
  return { filePath }
}

async function main() {
  const { help, filePath } = parseArgs(process.argv)

  if (help) {
    // Help goes to stderr so stdout stays clean for feedback
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

  const { port, decisionPromise, shutdown } = await startServer(absolutePath)

  const url = `http://localhost:${port}`
  process.stderr.write(`Server running at ${url}\n`)
  process.stderr.write(`Annotating: ${absolutePath}\n`)
  await open(url)

  // Block until user clicks Approve or Submit Feedback
  const decision = await decisionPromise

  // Give browser time to receive response
  await new Promise(r => setTimeout(r, 500))

  // Show decision on stderr (visible in CLI)
  if (decision.approved) {
    process.stderr.write('Decision: Approved (no changes)\n')
  } else {
    process.stderr.write(`Decision: Feedback with ${decision.annotationCount} annotation(s)\n`)
  }

  // Output feedback to stdout — this is what Claude reads
  // Use callback to ensure stdout is flushed before exit
  const output = decision.approved
    ? 'APPROVED: No changes requested.\n'
    : decision.feedback + '\n'

  process.stderr.write('\n--- Feedback sent to Claude Code ---\n')
  process.stderr.write(output)
  process.stderr.write('--- End ---\n')

  process.stdout.write(output, () => {
    shutdown()
    process.exit(0)
  })
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error.message}\n`)
  process.exit(1)
})
