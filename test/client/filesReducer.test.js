import { describe, it, expect } from 'vitest'
import { filesReducer } from '../../client/src/state/filesReducer.js'
import { initialAnnotationState } from '../../client/src/state/annotationReducer.js'

const makeFile = (overrides = {}) => ({
  path: '/test/file.md',
  content: '# Test',
  blocks: [],
  ...overrides
})

describe('filesReducer', () => {
  describe('INIT_FILES', () => {
    it('initializes files with annotation state', () => {
      const files = [makeFile({ path: '/a.md' }), makeFile({ path: '/b.md' })]
      const state = filesReducer([], { type: 'INIT_FILES', files })
      expect(state).toHaveLength(2)
      expect(state[0].path).toBe('/a.md')
      expect(state[0].annState).toEqual(initialAnnotationState)
      expect(state[1].path).toBe('/b.md')
      expect(state[1].annState).toEqual(initialAnnotationState)
    })

    it('preserves file properties', () => {
      const file = makeFile({ content: '# Hello', blocks: [{ id: 'block-0' }] })
      const state = filesReducer([], { type: 'INIT_FILES', files: [file] })
      expect(state[0].content).toBe('# Hello')
      expect(state[0].blocks).toEqual([{ id: 'block-0' }])
    })
  })

  describe('ADD_FILE', () => {
    it('appends a new file', () => {
      const initial = filesReducer([], { type: 'INIT_FILES', files: [makeFile({ path: '/a.md' })] })
      const state = filesReducer(initial, { type: 'ADD_FILE', file: makeFile({ path: '/b.md' }) })
      expect(state).toHaveLength(2)
      expect(state[1].path).toBe('/b.md')
      expect(state[1].annState).toEqual(initialAnnotationState)
    })
  })

  describe('UPDATE_FILE', () => {
    it('updates file at given index', () => {
      const initial = filesReducer([], {
        type: 'INIT_FILES',
        files: [makeFile({ path: '/a.md' }), makeFile({ path: '/b.md' })]
      })
      const state = filesReducer(initial, {
        type: 'UPDATE_FILE',
        fileIndex: 1,
        updates: { content: '# Updated' }
      })
      expect(state[1].content).toBe('# Updated')
      expect(state[0].content).toBe('# Test')
    })

    it('returns same state for out-of-bounds index (negative)', () => {
      const initial = filesReducer([], { type: 'INIT_FILES', files: [makeFile()] })
      const state = filesReducer(initial, { type: 'UPDATE_FILE', fileIndex: -1, updates: {} })
      expect(state).toBe(initial)
    })

    it('returns same state for out-of-bounds index (too large)', () => {
      const initial = filesReducer([], { type: 'INIT_FILES', files: [makeFile()] })
      const state = filesReducer(initial, { type: 'UPDATE_FILE', fileIndex: 5, updates: {} })
      expect(state).toBe(initial)
    })
  })

  describe('ANN', () => {
    it('dispatches annotation action to correct file', () => {
      const initial = filesReducer([], {
        type: 'INIT_FILES',
        files: [makeFile({ path: '/a.md' }), makeFile({ path: '/b.md' })]
      })
      const ann = { id: 'ann-1', blockId: 'block-0', startOffset: 0, endOffset: 5, type: 'COMMENT', text: 'Test', originalText: 'Hello' }
      const state = filesReducer(initial, {
        type: 'ANN',
        fileIndex: 0,
        annAction: { type: 'ADD', annotation: ann }
      })
      expect(state[0].annState.annotations).toHaveLength(1)
      expect(state[1].annState.annotations).toHaveLength(0)
    })

    it('returns same state for out-of-bounds fileIndex', () => {
      const initial = filesReducer([], { type: 'INIT_FILES', files: [makeFile()] })
      const state = filesReducer(initial, {
        type: 'ANN',
        fileIndex: 99,
        annAction: { type: 'ADD', annotation: {} }
      })
      expect(state).toBe(initial)
    })

    it('returns same state for negative fileIndex', () => {
      const initial = filesReducer([], { type: 'INIT_FILES', files: [makeFile()] })
      const state = filesReducer(initial, {
        type: 'ANN',
        fileIndex: -1,
        annAction: { type: 'ADD', annotation: {} }
      })
      expect(state).toBe(initial)
    })
  })

  describe('MARK_REVIEWED', () => {
    it('marks a file as reviewed', () => {
      const initial = filesReducer([], {
        type: 'INIT_FILES',
        files: [makeFile({ path: '/a.md' }), makeFile({ path: '/b.md' })]
      })
      expect(initial[1].reviewed).toBe(false)
      const state = filesReducer(initial, { type: 'MARK_REVIEWED', fileIndex: 1 })
      expect(state[1].reviewed).toBe(true)
      expect(state[0].reviewed).toBe(true) // first file is auto-reviewed
    })

    it('returns same state if already reviewed', () => {
      const initial = filesReducer([], {
        type: 'INIT_FILES',
        files: [makeFile({ path: '/a.md' })]
      })
      // First file is auto-reviewed
      expect(initial[0].reviewed).toBe(true)
      const state = filesReducer(initial, { type: 'MARK_REVIEWED', fileIndex: 0 })
      expect(state).toBe(initial)
    })

    it('returns same state for out-of-bounds index', () => {
      const initial = filesReducer([], { type: 'INIT_FILES', files: [makeFile()] })
      const state = filesReducer(initial, { type: 'MARK_REVIEWED', fileIndex: 5 })
      expect(state).toBe(initial)
    })
  })

  describe('INIT_FILES reviewed flag', () => {
    it('marks first file as reviewed, others as not', () => {
      const state = filesReducer([], {
        type: 'INIT_FILES',
        files: [makeFile({ path: '/a.md' }), makeFile({ path: '/b.md' }), makeFile({ path: '/c.md' })]
      })
      expect(state[0].reviewed).toBe(true)
      expect(state[1].reviewed).toBe(false)
      expect(state[2].reviewed).toBe(false)
    })
  })

  describe('ADD_FILE reviewed flag', () => {
    it('adds new file as not reviewed', () => {
      const initial = filesReducer([], { type: 'INIT_FILES', files: [makeFile({ path: '/a.md' })] })
      const state = filesReducer(initial, { type: 'ADD_FILE', file: makeFile({ path: '/b.md' }) })
      expect(state[1].reviewed).toBe(false)
    })
  })

  describe('unknown action', () => {
    it('returns current state', () => {
      const initial = [makeFile()]
      const state = filesReducer(initial, { type: 'UNKNOWN' })
      expect(state).toBe(initial)
    })
  })
})
