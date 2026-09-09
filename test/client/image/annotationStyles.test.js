import { describe, it, expect } from 'vitest'
import {
  resolveArrowStyle, ARROW_STYLES, strokeWidthOf, dashArrayFor, pickStyleFields,
  DEFAULT_STROKE_WIDTH, DEFAULT_HIGHLIGHTER_WIDTH
} from '../../../client/image/src/utils/annotationStyles.js'

describe('resolveArrowStyle', () => {
  it('passes through each known style unchanged', () => {
    expect(resolveArrowStyle('head')).toBe('head')
    expect(resolveArrowStyle('dimension')).toBe('dimension')
    expect(resolveArrowStyle('none')).toBe('none')
    expect(resolveArrowStyle('double')).toBe('double')
  })

  it('falls back to head for an absent value', () => {
    expect(resolveArrowStyle(undefined)).toBe('head')
  })

  it('falls back to head for an unknown/future value', () => {
    expect(resolveArrowStyle('triangle')).toBe('head')
  })
})

describe('ARROW_STYLES', () => {
  it('lists exactly the four resolvable styles', () => {
    expect(ARROW_STYLES.map((s) => s.id)).toEqual(['head', 'dimension', 'none', 'double'])
  })
})

describe('strokeWidthOf', () => {
  it('falls back to the box/arrow/freehand default when absent', () => {
    expect(strokeWidthOf({ type: 'box' })).toBe(DEFAULT_STROKE_WIDTH)
    expect(strokeWidthOf({ type: 'arrow' })).toBe(DEFAULT_STROKE_WIDTH)
    expect(strokeWidthOf({ type: 'freehand' })).toBe(DEFAULT_STROKE_WIDTH)
  })

  it('falls back to the highlighter default when absent', () => {
    expect(strokeWidthOf({ type: 'highlighter' })).toBe(DEFAULT_HIGHLIGHTER_WIDTH)
  })

  it('uses a stored value over the default', () => {
    expect(strokeWidthOf({ type: 'box', strokeWidth: 5 })).toBe(5)
    expect(strokeWidthOf({ type: 'highlighter', strokeWidth: 26 })).toBe(26)
  })
})

describe('dashArrayFor', () => {
  it('returns undefined for solid, absent, or an unknown style', () => {
    expect(dashArrayFor('solid', 3)).toBeUndefined()
    expect(dashArrayFor(undefined, 3)).toBeUndefined()
    expect(dashArrayFor('zigzag', 3)).toBeUndefined()
  })

  it('scales dashed and dotted patterns proportionally to the given width', () => {
    expect(dashArrayFor('dashed', 3)).toBe('9 6')
    expect(dashArrayFor('dashed', 6)).toBe('18 12')
    expect(dashArrayFor('dotted', 3)).toBe('3 4.5')
  })
})

describe('pickStyleFields', () => {
  it('keeps only the fields declared for the given type', () => {
    const source = { arrowStyle: 'double', strokeWidth: 5, dashStyle: 'dashed', color: '#fff' }
    expect(pickStyleFields('arrow', source)).toEqual({ arrowStyle: 'double', strokeWidth: 5, dashStyle: 'dashed' })
    expect(pickStyleFields('highlighter', source)).toEqual({ strokeWidth: 5 })
    expect(pickStyleFields('pin', source)).toEqual({})
  })

  it('omits a declared field the source does not have', () => {
    expect(pickStyleFields('box', { strokeWidth: 5 })).toEqual({ strokeWidth: 5 })
  })
})
