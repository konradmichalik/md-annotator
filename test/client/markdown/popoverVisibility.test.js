import { describe, it, expect } from 'vitest'
import { getOffscreenSide } from '../../../client/markdown/src/utils/popoverVisibility.js'

const VIEWPORT = 800

function rect(top, bottom) {
  return { top, bottom }
}

describe('getOffscreenSide', () => {
  it('returns null for a fully visible element', () => {
    expect(getOffscreenSide(rect(100, 300), VIEWPORT)).toBe(null)
  })

  it('returns above when the element sits entirely past the top edge', () => {
    expect(getOffscreenSide(rect(-250, -50), VIEWPORT)).toBe('above')
  })

  it('returns below when the element sits entirely past the bottom edge', () => {
    expect(getOffscreenSide(rect(900, 1100), VIEWPORT)).toBe('below')
  })

  it('treats a partially visible element as visible', () => {
    expect(getOffscreenSide(rect(-50, 120), VIEWPORT)).toBe(null)
    expect(getOffscreenSide(rect(760, 980), VIEWPORT)).toBe(null)
  })

  it('counts an element flush against an edge as offscreen', () => {
    expect(getOffscreenSide(rect(-200, 0), VIEWPORT)).toBe('above')
    expect(getOffscreenSide(rect(VIEWPORT, 1000), VIEWPORT)).toBe('below')
  })

  it('returns null without a rect', () => {
    expect(getOffscreenSide(null, VIEWPORT)).toBe(null)
  })
})
