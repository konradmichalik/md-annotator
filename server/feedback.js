/**
 * Format annotations as readable Markdown feedback for Claude.
 * Ported from Plannotator's exportDiff pattern.
 */
export function exportFeedback(annotations, blocks) {
  if (annotations.length === 0) {
    return 'No annotations.'
  }

  const sorted = [...annotations].sort((a, b) => {
    const blockA = blocks.findIndex(blk => blk.id === a.blockId)
    const blockB = blocks.findIndex(blk => blk.id === b.blockId)
    if (blockA !== blockB) return blockA - blockB
    return a.startOffset - b.startOffset
  })

  let output = `# Annotation Feedback\n\n`
  output += `${annotations.length} annotation${annotations.length > 1 ? 's' : ''}:\n\n`

  sorted.forEach((ann, index) => {
    output += `## ${index + 1}. `

    if (ann.type === 'DELETION') {
      output += `Remove this\n`
      output += `\`\`\`\n${ann.originalText}\n\`\`\`\n`
      output += `> User wants this removed from the document.\n`
    } else if (ann.type === 'COMMENT') {
      output += `Comment on\n`
      output += `\`\`\`\n${ann.originalText}\n\`\`\`\n`
      output += `> ${ann.text}\n`
    }

    output += '\n'
  })

  output += '---\n'
  return output
}
