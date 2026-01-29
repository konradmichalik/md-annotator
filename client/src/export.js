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
 * Download text as file.
 */
export function downloadAsFile(content, filename = 'annotations.md') {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
