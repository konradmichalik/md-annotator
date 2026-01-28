/**
 * Simplified markdown parser that splits content into linear blocks.
 * Designed for predictable text-anchoring (not AST-based).
 * Ported from Plannotator's parser.ts pattern.
 */
export function parseMarkdownToBlocks(markdown) {
  const lines = markdown.split('\n')
  const blocks = []
  let currentId = 0
  let buffer = []
  let currentType = 'paragraph'
  const currentLevel = 0
  let bufferStartLine = 1

  const flush = () => {
    if (buffer.length > 0) {
      const content = buffer.join('\n')
      blocks.push({
        id: `block-${currentId++}`,
        type: currentType,
        content,
        level: currentLevel,
        order: currentId,
        startLine: bufferStartLine
      })
      buffer = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const currentLineNum = i + 1

    // Headings
    if (trimmed.startsWith('#')) {
      flush()
      const level = trimmed.match(/^#+/)?.[0].length || 1
      blocks.push({
        id: `block-${currentId++}`,
        type: 'heading',
        content: trimmed.replace(/^#+\s*/, ''),
        level,
        order: currentId,
        startLine: currentLineNum
      })
      continue
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      flush()
      blocks.push({
        id: `block-${currentId++}`,
        type: 'hr',
        content: '',
        order: currentId,
        startLine: currentLineNum
      })
      continue
    }

    // List Items
    if (trimmed.match(/^(\*|-|\d+\.)\s/)) {
      flush()
      const leadingWhitespace = line.match(/^(\s*)/)?.[1] || ''
      const spaceCount = leadingWhitespace.replace(/\t/g, '  ').length
      const listLevel = Math.floor(spaceCount / 2)

      let content = trimmed.replace(/^(\*|-|\d+\.)\s/, '')

      let checked = undefined
      const checkboxMatch = content.match(/^\[([ xX])\]\s*/)
      if (checkboxMatch) {
        checked = checkboxMatch[1].toLowerCase() === 'x'
        content = content.replace(/^\[([ xX])\]\s*/, '')
      }

      blocks.push({
        id: `block-${currentId++}`,
        type: 'list-item',
        content,
        level: listLevel,
        checked,
        order: currentId,
        startLine: currentLineNum
      })
      continue
    }

    // Blockquotes
    if (trimmed.startsWith('>')) {
      flush()
      blocks.push({
        id: `block-${currentId++}`,
        type: 'blockquote',
        content: trimmed.replace(/^>\s*/, ''),
        order: currentId,
        startLine: currentLineNum
      })
      continue
    }

    // Code blocks
    if (trimmed.startsWith('```')) {
      flush()
      const codeStartLine = currentLineNum
      const language = trimmed.slice(3).trim() || undefined
      const codeContent = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeContent.push(lines[i])
        i++
      }
      blocks.push({
        id: `block-${currentId++}`,
        type: 'code',
        content: codeContent.join('\n'),
        language,
        order: currentId,
        startLine: codeStartLine
      })
      continue
    }

    // Tables
    if (trimmed.startsWith('|') || (trimmed.includes('|') && trimmed.match(/^\|?.+\|.+\|?$/))) {
      flush()
      const tableStartLine = currentLineNum
      const tableLines = [line]

      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim()
        if (nextLine.startsWith('|') || (nextLine.includes('|') && nextLine.match(/^\|?.+\|.+\|?$/))) {
          i++
          tableLines.push(lines[i])
        } else {
          break
        }
      }

      blocks.push({
        id: `block-${currentId++}`,
        type: 'table',
        content: tableLines.join('\n'),
        order: currentId,
        startLine: tableStartLine
      })
      continue
    }

    // Empty lines separate paragraphs
    if (trimmed === '') {
      flush()
      currentType = 'paragraph'
      continue
    }

    // Accumulate paragraph text
    if (buffer.length === 0) {
      bufferStartLine = currentLineNum
    }
    buffer.push(line)
  }

  flush()
  return blocks
}
