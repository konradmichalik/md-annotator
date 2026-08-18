/**
 * File I/O utilities for annotatable text files.
 */

import { readFile, stat } from 'node:fs/promises'
import { access, constants } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd'])

// Formats rendered as raw source with line numbers instead of rendered markdown.
// `.env` is deliberately excluded — those files routinely hold secrets.
const PLAIN_TEXT_EXTENSIONS = new Set([
  '.txt', '.text',
  '.yaml', '.yml', '.json', '.jsonc', '.json5',
  '.toml', '.ini', '.cfg', '.conf', '.properties',
  '.csv', '.tsv', '.log', '.xml'
])

// Dotfiles whose extension says nothing useful about the format
const PLAIN_TEXT_BASENAMES = new Set(['.env.example'])

// Reading a huge file would freeze the parser and the browser alike
const MAX_FILE_BYTES = 2 * 1024 * 1024

// A link may point at a directory (e.g. `docs/routing/`), meaning its index document
const DIRECTORY_INDEX_FILES = ['README.md', 'readme.md', 'index.md', 'Index.md']

export function isMarkdownFile(filePath) {
  const ext = extname(filePath).toLowerCase()
  return MARKDOWN_EXTENSIONS.has(ext)
}

export function isPlainTextFile(filePath) {
  if (PLAIN_TEXT_BASENAMES.has(basename(filePath).toLowerCase())) {
    return true
  }
  const ext = extname(filePath).toLowerCase()
  return PLAIN_TEXT_EXTENSIONS.has(ext)
}

export function isAnnotatableFile(filePath) {
  return isMarkdownFile(filePath) || isPlainTextFile(filePath)
}

export function supportedExtensions() {
  return [
    ...MARKDOWN_EXTENSIONS,
    ...PLAIN_TEXT_EXTENSIONS,
    ...PLAIN_TEXT_BASENAMES
  ]
}

export async function fileExists(filePath) {
  try {
    await access(filePath, constants.R_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Maps a link target to the file it stands for: a directory resolves to its index
 * document, everything else is returned unchanged.
 */
export async function resolveAnnotatablePath(targetPath) {
  const absolutePath = resolve(targetPath)

  try {
    const stats = await stat(absolutePath)
    if (!stats.isDirectory()) {
      return absolutePath
    }
  } catch {
    return absolutePath
  }

  for (const indexFile of DIRECTORY_INDEX_FILES) {
    const candidate = join(absolutePath, indexFile)
    if (await fileExists(candidate)) {
      return candidate
    }
  }

  return absolutePath
}

export async function readAnnotatableFile(filePath) {
  const absolutePath = resolve(filePath)

  if (!isAnnotatableFile(absolutePath)) {
    throw new Error(
      `Unsupported file type: ${absolutePath}\n` +
      `Supported: ${supportedExtensions().join(', ')}`
    )
  }

  try {
    const { size } = await stat(absolutePath)
    if (size > MAX_FILE_BYTES) {
      const mb = (size / 1024 / 1024).toFixed(1)
      throw new Error(
        `File too large: ${absolutePath} (${mb} MB, limit ${MAX_FILE_BYTES / 1024 / 1024} MB)`
      )
    }
    return await readFile(absolutePath, 'utf-8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${absolutePath}`)
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${absolutePath}`)
    }
    if (error.code) {
      throw new Error(`Failed to read file: ${error.message}`)
    }
    throw error
  }
}
