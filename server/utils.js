import { readFile } from 'node:fs/promises'
import { access, constants } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd'])

export function isMarkdownFile(filePath) {
  const ext = extname(filePath).toLowerCase()
  return MARKDOWN_EXTENSIONS.has(ext)
}

export async function fileExists(filePath) {
  try {
    await access(filePath, constants.R_OK)
    return true
  } catch {
    return false
  }
}

export async function readMarkdownFile(filePath) {
  const absolutePath = resolve(filePath)

  if (!isMarkdownFile(absolutePath)) {
    throw new Error(`Not a Markdown file: ${absolutePath}`)
  }

  try {
    const content = await readFile(absolutePath, 'utf-8')
    return content
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${absolutePath}`)
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${absolutePath}`)
    }
    throw new Error(`Failed to read file: ${error.message}`)
  }
}
