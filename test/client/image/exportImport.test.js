import { describe, it, expect } from 'vitest'
import { serializeAnnotations, parseAnnotationsJson } from '../../../client/image/src/utils/exportImport.js'

const sample = [{ id: 'ann-1', type: 'pin', geometry: { x: 1, y: 2 }, text: 'hi', color: '#e11d48', createdAt: 0 }]

describe('serializeAnnotations / parseAnnotationsJson', () => {
  it('round-trips a list of annotations', () => {
    const json = serializeAnnotations(sample)
    expect(parseAnnotationsJson(json)).toEqual(sample)
  })

  it('round-trips an annotation carrying the newer arrowStyle/strokeWidth/dashStyle fields untouched', () => {
    const withStyleFields = [{
      id: 'ann-2', type: 'arrow', geometry: { x1: 0, y1: 0, x2: 10, y2: 10 },
      text: '', color: '#e11d48', createdAt: 0,
      arrowStyle: 'double', strokeWidth: 5, dashStyle: 'dashed'
    }]
    const json = serializeAnnotations(withStyleFields)
    expect(parseAnnotationsJson(json)).toEqual(withStyleFields)
  })

  it('produces indented, readable JSON', () => {
    expect(serializeAnnotations(sample)).toContain('\n  ')
  })

  it('rejects malformed JSON with a clear error', () => {
    expect(() => parseAnnotationsJson('{not json')).toThrow(/Invalid annotations JSON/)
  })

  it('rejects valid JSON that is not an array', () => {
    expect(() => parseAnnotationsJson('{"foo": "bar"}')).toThrow(/must be an array/)
  })
})
