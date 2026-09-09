import { describe, it, expect } from 'vitest'
import { formatApprovalOutput, formatApprovalWithNotesOutput, exportFeedback } from '../../../server/image/feedback.js'

const pin = { type: 'pin', color: '#e11d48', text: 'This spacing looks off', geometry: { x: 10, y: 10 } }
const box = { type: 'box', color: '#e11d48', text: '', geometry: { x: 0, y: 0, width: 50, height: 50 } }

describe('formatApprovalOutput', () => {
  it('returns a fixed approval string', () => {
    expect(formatApprovalOutput()).toBe('APPROVED: No changes requested.\n')
  })
})

describe('formatApprovalWithNotesOutput', () => {
  it('includes the annotation count, the image path, and each note', () => {
    const output = formatApprovalWithNotesOutput([pin], 100, 100, '/tmp/annotated.png')
    expect(output).toContain('APPROVED WITH NOTES: 1 note.')
    expect(output).toContain('Annotated screenshot: /tmp/annotated.png')
    expect(output).toContain('This spacing looks off')
    expect(output).toContain('top left')
  })

  it('pluralizes the count correctly', () => {
    const output = formatApprovalWithNotesOutput([pin, box], 100, 100, '/tmp/annotated.png')
    expect(output).toContain('APPROVED WITH NOTES: 2 notes.')
  })
})

describe('exportFeedback', () => {
  it('lists every annotation with its type, position, and comment', () => {
    const output = exportFeedback([pin, box], 100, 100, '/tmp/annotated.png')
    expect(output).toContain('2 annotations on the screenshot.')
    expect(output).toContain('Annotated screenshot: /tmp/annotated.png')
    expect(output).toContain('1. Comment pin')
    expect(output).toContain('2. Boxed area')
    expect(output).toContain('This spacing looks off')
    expect(output).toContain('(no comment text)')
  })

  it('labels a highlighter mark', () => {
    const highlighter = { type: 'highlighter', color: '#e11d48', text: '', geometry: { points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] } }
    const output = exportFeedback([highlighter], 100, 100, '/tmp/annotated.png')
    expect(output).toContain('1. Highlighted area')
  })

  it('calls out annotations positioned close together', () => {
    const a = { type: 'box', color: '#e11d48', text: '', geometry: { x: 85, y: 15, width: 4, height: 4 } }
    const b = { type: 'box', color: '#e11d48', text: '', geometry: { x: 90, y: 18, width: 4, height: 4 } }
    const output = exportFeedback([a, b], 100, 100, '/tmp/annotated.png')
    expect(output).toContain('close to annotation 2, check the numbered marker in the image')
    expect(output).toContain('close to annotation 1, check the numbered marker in the image')
  })

  it('does not add a proximity note for annotations that are far apart', () => {
    const output = exportFeedback([pin, box], 100, 100, '/tmp/annotated.png')
    expect(output).not.toContain('close to annotation')
  })
})
