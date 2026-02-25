import { describe, it, expect } from 'vitest'
import { exportFeedback, exportMultiFileFeedback } from '../../server/feedback.js'

const makeBlock = (overrides = {}) => ({
  id: 'block-0',
  type: 'paragraph',
  content: 'Hello world this is a test',
  startLine: 1,
  ...overrides
})

const makeAnnotation = (overrides = {}) => ({
  id: 'ann-1',
  blockId: 'block-0',
  startOffset: 0,
  endOffset: 5,
  type: 'COMMENT',
  text: 'Fix this',
  originalText: 'Hello',
  ...overrides
})

describe('exportFeedback', () => {
  it('returns "No annotations." for empty array', () => {
    expect(exportFeedback([], [])).toBe('No annotations.')
  })

  it('formats a single COMMENT annotation', () => {
    const blocks = [makeBlock()]
    const annotations = [makeAnnotation()]
    const output = exportFeedback(annotations, blocks)

    expect(output).toContain('# Annotation Feedback')
    expect(output).toContain('1 annotation:')
    expect(output).toContain('## 1. Comment on (Line 1)')
    expect(output).toContain('```\nHello\n```')
    expect(output).toContain('> Fix this')
  })

  it('formats a single DELETION annotation', () => {
    const blocks = [makeBlock()]
    const annotations = [makeAnnotation({ type: 'DELETION', text: null, originalText: 'world' })]
    const output = exportFeedback(annotations, blocks)

    expect(output).toContain('## 1. Remove this (Line 1)')
    expect(output).toContain('```\nworld\n```')
    expect(output).toContain('> User wants this removed')
  })

  it('pluralizes annotation count', () => {
    const blocks = [makeBlock()]
    const annotations = [
      makeAnnotation({ id: 'ann-1' }),
      makeAnnotation({ id: 'ann-2', startOffset: 6, endOffset: 11, originalText: 'world' })
    ]
    const output = exportFeedback(annotations, blocks)
    expect(output).toContain('2 annotations:')
  })

  it('calculates line numbers for selections with offset', () => {
    const block = makeBlock({ content: 'Line one\nLine two\nLine three', startLine: 10 })
    const ann = makeAnnotation({ startOffset: 9, endOffset: 17, originalText: 'Line two' })
    const output = exportFeedback([ann], [block])
    expect(output).toContain('Line 11')
  })

  it('calculates line range for multi-line selections', () => {
    const block = makeBlock({ content: 'Line one\nLine two\nLine three', startLine: 1 })
    const ann = makeAnnotation({
      startOffset: 0,
      endOffset: 17,
      originalText: 'Line one\nLine two'
    })
    const output = exportFeedback([ann], [block])
    expect(output).toContain('Lines 1-2')
  })

  it('sorts annotations by block order then offset', () => {
    const blocks = [
      makeBlock({ id: 'block-0', startLine: 1 }),
      makeBlock({ id: 'block-1', startLine: 5 })
    ]
    const annotations = [
      makeAnnotation({ id: 'ann-2', blockId: 'block-1', startOffset: 0, originalText: 'Second' }),
      makeAnnotation({ id: 'ann-1', blockId: 'block-0', startOffset: 0, originalText: 'First' })
    ]
    const output = exportFeedback(annotations, blocks)
    const firstIdx = output.indexOf('First')
    const secondIdx = output.indexOf('Second')
    expect(firstIdx).toBeLessThan(secondIdx)
  })

  it('ends with ---', () => {
    const output = exportFeedback([makeAnnotation()], [makeBlock()])
    expect(output).toMatch(/---\n$/)
  })
})

describe('exportMultiFileFeedback', () => {
  it('returns "No annotations." when no files have annotations', () => {
    const files = [{ path: '/a.md', annotations: [], blocks: [] }]
    expect(exportMultiFileFeedback(files)).toBe('No annotations.')
  })

  it('delegates to exportFeedback for single file', () => {
    const files = [{
      path: '/a.md',
      annotations: [makeAnnotation()],
      blocks: [makeBlock()]
    }]
    const output = exportMultiFileFeedback(files)
    expect(output).toContain('# Annotation Feedback')
    expect(output).not.toContain('## File:')
  })

  it('groups annotations by file for multi-file', () => {
    const files = [
      {
        path: '/a.md',
        annotations: [makeAnnotation({ id: 'ann-1' })],
        blocks: [makeBlock()]
      },
      {
        path: '/b.md',
        annotations: [makeAnnotation({ id: 'ann-2' })],
        blocks: [makeBlock()]
      }
    ]
    const output = exportMultiFileFeedback(files)
    expect(output).toContain('## File: /a.md')
    expect(output).toContain('## File: /b.md')
    expect(output).toContain('2 annotations across 2 files')
  })

  it('uses global numbering across files', () => {
    const files = [
      {
        path: '/a.md',
        annotations: [makeAnnotation({ id: 'ann-1' })],
        blocks: [makeBlock()]
      },
      {
        path: '/b.md',
        annotations: [makeAnnotation({ id: 'ann-2' })],
        blocks: [makeBlock()]
      }
    ]
    const output = exportMultiFileFeedback(files)
    expect(output).toContain('### 1.')
    expect(output).toContain('### 2.')
  })

  it('skips files without annotations', () => {
    const files = [
      { path: '/a.md', annotations: [], blocks: [] },
      {
        path: '/b.md',
        annotations: [makeAnnotation()],
        blocks: [makeBlock()]
      }
    ]
    const output = exportMultiFileFeedback(files)
    expect(output).not.toContain('## File: /a.md')
    expect(output).toContain('## File: /b.md')
    expect(output).toContain('1 annotation across 1 file')
  })
})
