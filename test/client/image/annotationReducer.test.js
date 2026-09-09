import { describe, it, expect } from 'vitest'
import { annotationReducer, initialAnnotationState } from '../../../client/image/src/state/annotationReducer.js'

const makeAnnotation = (overrides = {}) => ({
  id: 'ann-1',
  type: 'pin',
  geometry: { x: 10, y: 10 },
  text: 'Fix this',
  color: '#e11d48',
  createdAt: 0,
  ...overrides
})

describe('annotationReducer', () => {
  it('has the correct initial shape', () => {
    expect(initialAnnotationState).toEqual({ annotations: [], history: [], redo: [] })
  })

  it('ADD appends an annotation and records history', () => {
    const ann = makeAnnotation()
    const next = annotationReducer(initialAnnotationState, { type: 'ADD', annotation: ann })
    expect(next.annotations).toEqual([ann])
    expect(next.history).toEqual([{ action: 'add', annotation: ann }])
    expect(next.redo).toEqual([])
  })

  it('UPDATE merges changes into the matching annotation', () => {
    const state = { annotations: [makeAnnotation()], history: [], redo: [] }
    const next = annotationReducer(state, { type: 'UPDATE', id: 'ann-1', changes: { text: 'Changed' } })
    expect(next.annotations[0].text).toBe('Changed')
    expect(next.annotations[0].geometry).toEqual({ x: 10, y: 10 })
  })

  it('REMOVE drops the matching annotation and records history', () => {
    const ann = makeAnnotation()
    const state = { annotations: [ann], history: [], redo: [] }
    const next = annotationReducer(state, { type: 'REMOVE', id: 'ann-1' })
    expect(next.annotations).toEqual([])
    expect(next.history).toEqual([{ action: 'remove', annotation: ann }])
  })

  it('REMOVE is a no-op for an unknown id', () => {
    const state = { annotations: [makeAnnotation()], history: [], redo: [] }
    const next = annotationReducer(state, { type: 'REMOVE', id: 'does-not-exist' })
    expect(next.annotations).toHaveLength(1)
    expect(next.history).toEqual([])
  })

  it('SET_ALL replaces the annotation list wholesale', () => {
    const state = { annotations: [makeAnnotation()], history: [], redo: [] }
    const next = annotationReducer(state, { type: 'SET_ALL', annotations: [] })
    expect(next.annotations).toEqual([])
  })

  it('returns the same state for an unknown action type', () => {
    expect(annotationReducer(initialAnnotationState, { type: 'NOPE' })).toBe(initialAnnotationState)
  })
})
