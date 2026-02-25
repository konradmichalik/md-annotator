/**
 * Format a single annotation as Markdown feedback.
 */
function formatAnnotation(ann, block, heading) {
  const blockStartLine = block?.startLine || 1

  // Element-level annotations (image or diagram)
  if (ann.targetType === 'image') {
    const isDeletion = ann.type === 'DELETION'
    const label = isDeletion ? 'Remove image' : 'Comment on image'
    let output = `${heading} ${label} (Line ${blockStartLine})\n`
    output += `Image: \`${ann.originalText}\`\n`
    if (ann.imageAlt) { output += `Alt text: "${ann.imageAlt}"\n` }
    if (ann.imageSrc) { output += `Source: ${ann.imageSrc}\n` }
    if (isDeletion) {
      output += `> User wants this image removed from the document.\n`
    } else {
      output += `> ${(ann.text ?? '').replace(/\n/g, '\n> ')}\n`
    }
    return output + '\n'
  }

  if (ann.targetType === 'diagram') {
    const isDeletion = ann.type === 'DELETION'
    const label = isDeletion ? 'Remove Mermaid diagram' : 'Comment on Mermaid diagram'
    let output = `${heading} ${label} (Line ${blockStartLine})\n`
    output += `\`\`\`mermaid\n${block?.content || ann.originalText}\n\`\`\`\n`
    if (isDeletion) {
      output += `> User wants this diagram removed from the document.\n`
    } else {
      output += `> ${(ann.text ?? '').replace(/\n/g, '\n> ')}\n`
    }
    return output + '\n'
  }

  const blockContent = block?.content || ''
  const textBeforeSelection = blockContent.slice(0, ann.startOffset)
  const linesBeforeSelection = (textBeforeSelection.match(/\n/g) || []).length
  const startLine = blockStartLine + linesBeforeSelection
  const newlinesInSelection = (ann.originalText.match(/\n/g) || []).length
  const endLine = startLine + newlinesInSelection
  const lineRef = startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`

  let output = `${heading} `

  if (ann.type === 'DELETION') {
    output += `Remove this (${lineRef})\n`
    output += `\`\`\`\n${ann.originalText}\n\`\`\`\n`
    output += `> User wants this removed from the document.\n`
  } else if (ann.type === 'COMMENT') {
    output += `Comment on (${lineRef})\n`
    output += `\`\`\`\n${ann.originalText}\n\`\`\`\n`
    output += `> ${ann.text.replace(/\n/g, '\n> ')}\n`
  } else if (ann.type === 'INSERTION') {
    output += `Insert text (${lineRef})\n`
    if (ann.afterContext) {
      output += `After: \`${ann.afterContext}\`\n`
    }
    output += `\`\`\`\n${ann.text}\n\`\`\`\n`
    output += `> User wants this text inserted at this point in the document.\n`
  }

  return output + '\n'
}

function sortAnnotations(annotations, blocks) {
  return [...annotations].sort((a, b) => {
    const blockA = blocks.findIndex(blk => blk.id === a.blockId)
    const blockB = blocks.findIndex(blk => blk.id === b.blockId)
    if (blockA !== blockB) {return blockA - blockB}
    return a.startOffset - b.startOffset
  })
}

/**
 * Format annotations from multiple files as readable Markdown feedback.
 * Single file delegates to exportFeedback. Multi-file groups by file.
 */
export function exportMultiFileFeedback(files) {
  const filesWithAnnotations = files.filter(f => f.annotations?.length > 0)

  if (filesWithAnnotations.length === 0) {
    return 'No annotations.'
  }

  if (files.length === 1) {
    return exportFeedback(files[0].annotations, files[0].blocks)
  }

  const totalCount = filesWithAnnotations.reduce((sum, f) => sum + f.annotations.length, 0)
  let output = `# Annotation Feedback\n\n`
  output += `${totalCount} annotation${totalCount > 1 ? 's' : ''} across ${filesWithAnnotations.length} file${filesWithAnnotations.length > 1 ? 's' : ''}:\n\n`

  let globalIndex = 1
  for (const file of filesWithAnnotations) {
    output += `---\n\n## File: ${file.path}\n\n`
    const sorted = sortAnnotations(file.annotations, file.blocks)
    const globalComments = sorted.filter(a => a.targetType === 'global')
    const regularAnnotations = sorted.filter(a => a.targetType !== 'global')

    if (globalComments.length > 0) {
      output += `### General Feedback\n\n`
      globalComments.forEach(ann => {
        output += `> ${(ann.text ?? '').replace(/\n/g, '\n> ')}\n\n`
      })
    }

    for (const ann of regularAnnotations) {
      const block = file.blocks.find(blk => blk.id === ann.blockId)
      output += formatAnnotation(ann, block, `### ${globalIndex}.`)
      globalIndex++
    }
  }

  output += '---\n'
  return output
}

/**
 * Format annotations as readable Markdown feedback for Claude.
 */
export function exportFeedback(annotations, blocks) {
  if (annotations.length === 0) {
    return 'No annotations.'
  }

  const sorted = sortAnnotations(annotations, blocks)
  const globalComments = sorted.filter(a => a.targetType === 'global')
  const regularAnnotations = sorted.filter(a => a.targetType !== 'global')

  let output = `# Annotation Feedback\n\n`
  output += `${annotations.length} annotation${annotations.length > 1 ? 's' : ''}:\n\n`

  if (globalComments.length > 0) {
    output += `## General Feedback\n\n`
    globalComments.forEach(ann => {
      output += `> ${(ann.text ?? '').replace(/\n/g, '\n> ')}\n\n`
    })
  }

  regularAnnotations.forEach((ann, index) => {
    const block = blocks.find(blk => blk.id === ann.blockId)
    output += formatAnnotation(ann, block, `## ${index + 1}.`)
  })

  output += '---\n'
  return output
}
