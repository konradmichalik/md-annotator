/**
 * Format annotations as readable Markdown feedback for Claude.
 */
export function exportFeedback(annotations, blocks) {
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
  output += `${annotations.length} annotation${annotations.length > 1 ? 's' : ''}:\n\n`

  sorted.forEach((ann, index) => {
    const block = blocks.find(blk => blk.id === ann.blockId)
    const blockStartLine = block?.startLine || 1
    const blockContent = block?.content || ''

    // Count newlines before startOffset to find actual line
    const textBeforeSelection = blockContent.slice(0, ann.startOffset)
    const linesBeforeSelection = (textBeforeSelection.match(/\n/g) || []).length
    const startLine = blockStartLine + linesBeforeSelection

    // Count newlines in selected text to find end line
    const newlinesInSelection = (ann.originalText.match(/\n/g) || []).length
    const endLine = startLine + newlinesInSelection

    const lineRef = startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`

    output += `## ${index + 1}. `

    if (ann.type === 'DELETION') {
      output += `Remove this (${lineRef})\n`
      output += `\`\`\`\n${ann.originalText}\n\`\`\`\n`
      output += `> User wants this removed from the document.\n`
    } else if (ann.type === 'COMMENT') {
      output += `Comment on (${lineRef})\n`
      output += `\`\`\`\n${ann.originalText}\n\`\`\`\n`
      output += `> ${ann.text}\n`
    }

    output += '\n'
  })

  output += '---\n'
  return output
}
