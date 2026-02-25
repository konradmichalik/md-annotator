import { describe, it, expect } from 'vitest'
import { parseMarkdownToBlocks } from '../../client/src/utils/parser.js'

describe('parseMarkdownToBlocks', () => {
  describe('headings', () => {
    it('parses h1', () => {
      const blocks = parseMarkdownToBlocks('# Hello')
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({
        type: 'heading',
        content: 'Hello',
        level: 1,
        startLine: 1
      })
    })

    it('parses h2 through h6', () => {
      const md = '## Two\n### Three\n#### Four\n##### Five\n###### Six'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(5)
      expect(blocks.map(b => b.level)).toEqual([2, 3, 4, 5, 6])
      expect(blocks.map(b => b.content)).toEqual(['Two', 'Three', 'Four', 'Five', 'Six'])
    })

    it('strips leading # and whitespace from heading content', () => {
      const blocks = parseMarkdownToBlocks('###   Spaced')
      expect(blocks[0].content).toBe('Spaced')
    })
  })

  describe('paragraphs', () => {
    it('parses a single paragraph', () => {
      const blocks = parseMarkdownToBlocks('Hello world')
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({
        type: 'paragraph',
        content: 'Hello world',
        startLine: 1
      })
    })

    it('merges consecutive lines into one paragraph', () => {
      const blocks = parseMarkdownToBlocks('Line one\nLine two')
      expect(blocks).toHaveLength(1)
      expect(blocks[0].content).toBe('Line one\nLine two')
    })

    it('splits paragraphs on blank lines', () => {
      const blocks = parseMarkdownToBlocks('First para\n\nSecond para')
      expect(blocks).toHaveLength(2)
      expect(blocks[0].content).toBe('First para')
      expect(blocks[1].content).toBe('Second para')
    })

    it('tracks correct startLine for paragraphs', () => {
      const blocks = parseMarkdownToBlocks('First\n\nSecond')
      expect(blocks[0].startLine).toBe(1)
      expect(blocks[1].startLine).toBe(3)
    })
  })

  describe('code blocks', () => {
    it('parses a fenced code block', () => {
      const md = '```\nconst x = 1\n```'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({
        type: 'code',
        content: 'const x = 1',
        startLine: 1
      })
    })

    it('captures language specifier', () => {
      const md = '```javascript\nconst x = 1\n```'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks[0].language).toBe('javascript')
    })

    it('sets language to undefined when not specified', () => {
      const md = '```\ncode\n```'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks[0].language).toBeUndefined()
    })

    it('handles multi-line code blocks', () => {
      const md = '```py\nline1\nline2\nline3\n```'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks[0].content).toBe('line1\nline2\nline3')
      expect(blocks[0].language).toBe('py')
    })

    it('handles empty code blocks', () => {
      const md = '```\n```'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].content).toBe('')
    })
  })

  describe('list items', () => {
    it('parses unordered list with -', () => {
      const md = '- Item one\n- Item two'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(2)
      expect(blocks[0]).toMatchObject({ type: 'list-item', content: 'Item one', level: 0 })
      expect(blocks[1]).toMatchObject({ type: 'list-item', content: 'Item two', level: 0 })
    })

    it('parses unordered list with *', () => {
      const md = '* Alpha\n* Beta'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(2)
      expect(blocks[0].content).toBe('Alpha')
    })

    it('parses ordered list', () => {
      const md = '1. First\n2. Second'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(2)
      expect(blocks[0]).toMatchObject({ type: 'list-item', content: 'First' })
      expect(blocks[1]).toMatchObject({ type: 'list-item', content: 'Second' })
    })

    it('detects nested list levels via indentation', () => {
      const md = '- Top\n  - Nested\n    - Deep'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks.map(b => b.level)).toEqual([0, 1, 2])
    })

    it('parses unchecked checkbox', () => {
      const md = '- [ ] Todo'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks[0].checked).toBe(false)
      expect(blocks[0].content).toBe('Todo')
    })

    it('parses checked checkbox', () => {
      const md = '- [x] Done'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks[0].checked).toBe(true)
      expect(blocks[0].content).toBe('Done')
    })

    it('parses uppercase X checkbox', () => {
      const md = '- [X] Also done'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks[0].checked).toBe(true)
    })

    it('leaves checked undefined for non-checkbox items', () => {
      const md = '- Normal item'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks[0].checked).toBeUndefined()
    })
  })

  describe('blockquotes', () => {
    it('parses a blockquote', () => {
      const blocks = parseMarkdownToBlocks('> Quote text')
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({
        type: 'blockquote',
        content: 'Quote text',
        startLine: 1
      })
    })

    it('strips > prefix and all leading whitespace', () => {
      const blocks = parseMarkdownToBlocks('>  Spaced quote')
      expect(blocks[0].content).toBe('Spaced quote')
    })

    it('treats consecutive blockquote lines as separate blocks', () => {
      const md = '> Line one\n> Line two'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(2)
    })
  })

  describe('horizontal rules', () => {
    it('parses --- as hr', () => {
      const blocks = parseMarkdownToBlocks('---')
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({ type: 'hr', content: '' })
    })

    it('parses *** as hr', () => {
      const blocks = parseMarkdownToBlocks('***')
      expect(blocks).toHaveLength(1)
      expect(blocks[0].type).toBe('hr')
    })
  })

  describe('tables', () => {
    it('parses a simple table', () => {
      const md = '| A | B |\n| --- | --- |\n| 1 | 2 |'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({
        type: 'table',
        content: md,
        startLine: 1
      })
    })

    it('collects all consecutive table rows', () => {
      const md = '| H1 | H2 |\n| - | - |\n| a | b |\n| c | d |'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].content.split('\n')).toHaveLength(4)
    })
  })

  describe('html blocks', () => {
    it('treats inline void tags as paragraphs', () => {
      const blocks = parseMarkdownToBlocks('<br/>')
      expect(blocks).toHaveLength(1)
      expect(blocks[0].type).toBe('paragraph')
    })

    it('parses a block-level void element', () => {
      const blocks = parseMarkdownToBlocks('<hr>')
      expect(blocks[0].type).toBe('html')
    })

    it('parses a multi-line div block', () => {
      const md = '<div align="center">\n  <p>Hello</p>\n</div>'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({ type: 'html', content: md, startLine: 1 })
    })

    it('parses a details/summary block', () => {
      const md = '<details>\n<summary>Click me</summary>\nHidden content\n</details>'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].type).toBe('html')
      expect(blocks[0].content).toContain('</details>')
    })

    it('parses a picture element', () => {
      const md = '<picture>\n  <source srcset="img.webp">\n  <img src="img.png" alt="test">\n</picture>'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].type).toBe('html')
    })

    it('parses a single-line HTML comment', () => {
      const blocks = parseMarkdownToBlocks('<!-- comment -->')
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({ type: 'html', content: '<!-- comment -->', startLine: 1 })
    })

    it('parses a multi-line HTML comment', () => {
      const md = '<!--\nMulti-line\ncomment\n-->'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].type).toBe('html')
      expect(blocks[0].content).toContain('-->')
    })

    it('parses a same-line open/close tag', () => {
      const md = '<p align="center">Centered text</p>'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({ type: 'html', content: md })
    })

    it('handles HTML block between paragraphs', () => {
      const md = 'Before\n\n<div>Block</div>\n\nAfter'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(3)
      expect(blocks[0].type).toBe('paragraph')
      expect(blocks[1].type).toBe('html')
      expect(blocks[2].type).toBe('paragraph')
    })

    it('does not affect HTML inside code blocks', () => {
      const md = '```html\n<div>Not an HTML block</div>\n```'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].type).toBe('code')
      expect(blocks[0].content).toBe('<div>Not an HTML block</div>')
    })

    it('tracks line numbers correctly through HTML blocks', () => {
      const md = '# Title\n\n<div>\n  Content\n</div>\n\nAfter'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks[0].startLine).toBe(1)
      expect(blocks[1].startLine).toBe(3)
      expect(blocks[2].startLine).toBe(7)
    })

    it('parses nested same-name HTML tags as a single block', () => {
      const md = '<div>\n  <div>inner</div>\n</div>'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toMatchObject({ type: 'html', content: md })
    })
  })

  describe('mixed content', () => {
    it('parses heading followed by paragraph', () => {
      const md = '# Title\n\nSome text here.'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks).toHaveLength(2)
      expect(blocks[0].type).toBe('heading')
      expect(blocks[1].type).toBe('paragraph')
    })

    it('parses a complex document', () => {
      const md = [
        '# Heading',
        '',
        'Paragraph text.',
        '',
        '- List item 1',
        '- List item 2',
        '',
        '```js',
        'const x = 1',
        '```',
        '',
        '> A quote',
        '',
        '---',
        '',
        '| Col | Col |',
        '| --- | --- |',
        '| A   | B   |'
      ].join('\n')

      const blocks = parseMarkdownToBlocks(md)
      const types = blocks.map(b => b.type)
      expect(types).toEqual([
        'heading', 'paragraph', 'list-item', 'list-item',
        'code', 'blockquote', 'hr', 'table'
      ])
    })

    it('tracks line numbers correctly through mixed content', () => {
      const md = '# Title\n\nParagraph\n\n```\ncode\n```\n\n> Quote'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks[0].startLine).toBe(1)  // heading
      expect(blocks[1].startLine).toBe(3)  // paragraph
      expect(blocks[2].startLine).toBe(5)  // code
      expect(blocks[3].startLine).toBe(9)  // quote
    })
  })

  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(parseMarkdownToBlocks('')).toEqual([])
    })

    it('returns empty array for whitespace-only input', () => {
      expect(parseMarkdownToBlocks('   \n\n   ')).toEqual([])
    })

    it('assigns unique sequential ids', () => {
      const md = '# A\n\nText\n\n- Item'
      const blocks = parseMarkdownToBlocks(md)
      const ids = blocks.map(b => b.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids).toEqual(['block-0', 'block-1', 'block-2'])
    })

    it('assigns sequential order values', () => {
      const md = '# A\n\nText'
      const blocks = parseMarkdownToBlocks(md)
      expect(blocks[0].order).toBeLessThan(blocks[1].order)
    })
  })
})
