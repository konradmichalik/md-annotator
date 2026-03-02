/**
 * Convert feedback notes (from --feedback-notes) to annotation objects.
 * Maps line-referenced notes to block IDs + offsets using the shared parser.
 */

import { randomUUID } from 'node:crypto'
import { parseMarkdownToBlocks } from '../client/src/utils/parser.js'

/**
 * Convert an array of notes into annotation objects for a single file.
 *
 * @param {Array<{text: string, line?: number}>} notes
 * @param {string} markdownContent - The raw markdown file content
 * @returns {Array<Object>} Annotation objects ready for the store
 */
export function convertNotesToAnnotations(notes, markdownContent) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return []
  }

  const blocks = parseMarkdownToBlocks(markdownContent)
  const contentLines = markdownContent.split('\n')

  return notes
    .filter(note => note && typeof note.text === 'string' && note.text.trim())
    .map(note => {
      if (note.line != null && typeof note.line === 'number' && note.line > 0) {
        return createLineAnnotation(note, blocks, contentLines)
      }
      return createGlobalAnnotation(note)
    })
}

function createGlobalAnnotation(note) {
  return {
    id: randomUUID(),
    blockId: '',
    startOffset: 0,
    endOffset: 0,
    type: 'NOTES',
    targetType: 'global',
    text: note.text.trim(),
    originalText: '',
    createdAt: Date.now(),
    startMeta: null,
    endMeta: null
  }
}

function createLineAnnotation(note, blocks, contentLines) {
  const line = note.line
  const block = findBlockForLine(blocks, line)

  if (!block) {
    // Fallback to global if line is out of range
    return createGlobalAnnotation(note)
  }

  // Get the line content and compute offsets within the block
  const lineContent = (line <= contentLines.length) ? contentLines[line - 1] : ''
  const blockLines = block.content.split('\n')

  // Find which line within the block corresponds to the target line
  const lineWithinBlock = line - block.startLine
  let startOffset = 0
  for (let i = 0; i < lineWithinBlock && i < blockLines.length; i++) {
    startOffset += blockLines[i].length + 1 // +1 for newline
  }
  const endOffset = startOffset + (blockLines[lineWithinBlock] || '').length

  return {
    id: randomUUID(),
    blockId: block.id,
    startOffset,
    endOffset,
    type: 'NOTES',
    targetType: undefined,
    text: note.text.trim(),
    originalText: blockLines[lineWithinBlock] || lineContent,
    createdAt: Date.now(),
    startMeta: null,
    endMeta: null
  }
}

/**
 * Find which block a given line number falls into.
 * Blocks are sorted by startLine; we find the last block whose startLine <= line.
 */
function findBlockForLine(blocks, line) {
  let matched = null
  for (const block of blocks) {
    if (block.startLine <= line) {
      matched = block
    } else {
      break
    }
  }
  return matched
}
