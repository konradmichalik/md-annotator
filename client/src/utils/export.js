/**
 * Export utilities for annotations.
 * Mirrors server/feedback.js format for consistency.
 */

/**
 * Format annotations as exportable markdown.
 */
export function formatAnnotationsForExport(annotations, blocks, filePath) {
  if (annotations.length === 0) {
    return 'No annotations.'
  }

  const sorted = [...annotations].sort((a, b) => {
    const blockA = blocks.findIndex(blk => blk.id === a.blockId)
    const blockB = blocks.findIndex(blk => blk.id === b.blockId)
    if (blockA !== blockB) {return blockA - blockB}
    return a.startOffset - b.startOffset
  })

  let output = `# Annotation Feedback\n\n`
  output += `**File:** \`${filePath}\`\n\n`
  output += `**Count:** ${annotations.length} annotation${annotations.length > 1 ? 's' : ''}\n\n`
  output += `---\n\n`

  sorted.forEach((ann, index) => {
    const block = blocks.find(blk => blk.id === ann.blockId)
    const blockStartLine = block?.startLine || 1
    const blockContent = block?.content || ''

    const textBeforeSelection = blockContent.slice(0, ann.startOffset)
    const linesBeforeSelection = (textBeforeSelection.match(/\n/g) || []).length
    const startLine = blockStartLine + linesBeforeSelection
    const newlinesInSelection = (ann.originalText.match(/\n/g) || []).length
    const endLine = startLine + newlinesInSelection

    const lineRef = startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`

    output += `## ${index + 1}. `

    if (ann.type === 'DELETION') {
      output += `Remove (${lineRef})\n\n`
      output += `\`\`\`\n${ann.originalText}\n\`\`\`\n\n`
    } else if (ann.type === 'COMMENT') {
      output += `Comment (${lineRef})\n\n`
      output += `\`\`\`\n${ann.originalText}\n\`\`\`\n\n`
      output += `> ${ann.text}\n\n`
    }
  })

  return output
}

/**
 * Copy text to clipboard with fallback.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    return true
  }
}

/**
 * Trigger a browser file download from a Blob.
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Download text as Markdown file.
 */
export function downloadAsFile(content, filename = 'annotations.md') {
  downloadBlob(new Blob([content], { type: 'text/markdown' }), filename)
}

/**
 * Format annotations as JSON export with metadata.
 */
export function formatAnnotationsForJsonExport(annotations, filePath, contentHash) {
  return {
    version: 1,
    filePath,
    contentHash,
    exportedAt: new Date().toISOString(),
    annotations: annotations.map(ann => ({
      id: ann.id,
      blockId: ann.blockId,
      startOffset: ann.startOffset,
      endOffset: ann.endOffset,
      type: ann.type,
      text: ann.text,
      originalText: ann.originalText,
      createdAt: ann.createdAt,
      startMeta: ann.startMeta,
      endMeta: ann.endMeta
    }))
  }
}

/**
 * Download data as JSON file.
 */
export function downloadAsJsonFile(data, filename = 'annotations.json') {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename)
}

/**
 * Validate imported JSON annotation data.
 */
const REQUIRED_ANNOTATION_FIELDS = [
  'id', 'blockId', 'startOffset', 'endOffset',
  'type', 'originalText', 'startMeta', 'endMeta'
]

export function validateAnnotationImport(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid JSON format' }
  }
  if (data.version !== 1) {
    return { valid: false, error: `Unsupported version: ${data.version}` }
  }
  if (!Array.isArray(data.annotations)) {
    return { valid: false, error: 'Missing annotations array' }
  }
  if (data.annotations.length > 10000) {
    return { valid: false, error: 'Too many annotations (max 10,000)' }
  }
  for (const ann of data.annotations) {
    for (const field of REQUIRED_ANNOTATION_FIELDS) {
      if (ann[field] === undefined) {
        return { valid: false, error: `Annotation missing required field: ${field}` }
      }
    }
    if (typeof ann.id !== 'string' || typeof ann.blockId !== 'string') {
      return { valid: false, error: 'Annotation id and blockId must be strings' }
    }
    if (typeof ann.startOffset !== 'number' || typeof ann.endOffset !== 'number') {
      return { valid: false, error: 'Annotation offsets must be numbers' }
    }
    if (ann.startOffset < 0 || ann.endOffset < 0 || ann.endOffset < ann.startOffset) {
      return { valid: false, error: 'Invalid annotation offset values' }
    }
    if (ann.type !== 'DELETION' && ann.type !== 'COMMENT') {
      return { valid: false, error: `Invalid annotation type: ${ann.type}` }
    }
    if (typeof ann.originalText !== 'string') {
      return { valid: false, error: 'Annotation originalText must be a string' }
    }
    if (ann.text !== null && ann.text !== undefined && typeof ann.text !== 'string') {
      return { valid: false, error: 'Annotation text must be a string or null' }
    }
    if (!ann.startMeta || typeof ann.startMeta !== 'object') {
      return { valid: false, error: 'Annotation startMeta must be an object' }
    }
    if (!ann.endMeta || typeof ann.endMeta !== 'object') {
      return { valid: false, error: 'Annotation endMeta must be an object' }
    }
  }
  return {
    valid: true,
    error: null,
    annotations: data.annotations,
    filePath: data.filePath || null,
    contentHash: data.contentHash || null
  }
}
