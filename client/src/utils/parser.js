const HTML_BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'center', 'dd', 'details',
  'dialog', 'dir', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup',
  'hr', 'iframe', 'main', 'menu', 'nav', 'ol', 'p', 'picture', 'pre',
  'section', 'source', 'summary', 'table', 'tbody', 'td', 'template',
  'tfoot', 'th', 'thead', 'tr', 'ul', 'video'
])

const HTML_VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
])

/**
 * Simplified markdown parser that splits content into linear blocks.
 * Designed for predictable text-anchoring (not AST-based).
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

    // HTML blocks
    if (trimmed.startsWith('<')) {
      // HTML comments
      if (trimmed.startsWith('<!--')) {
        flush()
        const htmlStartLine = currentLineNum
        const htmlLines = [line]
        if (!trimmed.includes('-->')) {
          i++
          while (i < lines.length) {
            htmlLines.push(lines[i])
            if (lines[i].includes('-->')) break
            i++
          }
        }
        blocks.push({
          id: `block-${currentId++}`,
          type: 'html',
          content: htmlLines.join('\n'),
          order: currentId,
          startLine: htmlStartLine
        })
        continue
      }

      // Block-level HTML tags
      const tagMatch = trimmed.match(/^<([a-zA-Z][a-zA-Z0-9]*)[\s>/]/)
      if (tagMatch && HTML_BLOCK_TAGS.has(tagMatch[1].toLowerCase())) {
        flush()
        const tagName = tagMatch[1].toLowerCase()
        const htmlStartLine = currentLineNum
        const htmlLines = [line]

        const isSelfClosing = trimmed.endsWith('/>')
        const isVoid = HTML_VOID_TAGS.has(tagName)
        const hasSameLineClose = new RegExp(`</${tagName}\\s*>`, 'i').test(trimmed)

        if (!isSelfClosing && !isVoid && !hasSameLineClose) {
          const closePattern = new RegExp(`</${tagName}\\s*>`, 'i')
          i++
          while (i < lines.length) {
            htmlLines.push(lines[i])
            if (closePattern.test(lines[i])) break
            i++
          }
        }

        blocks.push({
          id: `block-${currentId++}`,
          type: 'html',
          content: htmlLines.join('\n'),
          order: currentId,
          startLine: htmlStartLine
        })
        continue
      }
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
