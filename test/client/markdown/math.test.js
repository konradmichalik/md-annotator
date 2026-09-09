import { describe, it, expect } from 'vitest'
import { matchInlineMath, findDisplayMath } from '../../../client/markdown/src/utils/math.js'

describe('matchInlineMath', () => {
  it('matches dollar-delimited math at the start of the text', () => {
    expect(matchInlineMath('$E = mc^2$ and more')).toEqual({
      raw: '$E = mc^2$',
      formula: 'E = mc^2',
      display: false
    })
  })

  it('matches backslash-paren math', () => {
    expect(matchInlineMath('\\(a + b\\) trailing')).toEqual({
      raw: '\\(a + b\\)',
      formula: 'a + b',
      display: false
    })
  })

  it('leaves dollar amounts alone', () => {
    expect(matchInlineMath('$5-$10')).toBe(null)
    expect(matchInlineMath('$50,000-$100,000')).toBe(null)
    expect(matchInlineMath('$5/mo up to $10/mo')).toBe(null)
    expect(matchInlineMath('$5 and $10')).toBe(null)
  })

  it('rejects content that is only a number', () => {
    expect(matchInlineMath('$100$')).toBe(null)
    expect(matchInlineMath('$1.000,50$')).toBe(null)
  })

  it('rejects an unterminated delimiter', () => {
    expect(matchInlineMath('$x + y has no end')).toBe(null)
    expect(matchInlineMath('\\(x + y')).toBe(null)
  })

  it('does not span a line break', () => {
    expect(matchInlineMath('$x\ny$')).toBe(null)
  })

  it('requires non-space right inside the delimiters', () => {
    expect(matchInlineMath('$ x $')).toBe(null)
    expect(matchInlineMath('$x $')).toBe(null)
  })

  it('treats an inline $$…$$ span as display math', () => {
    expect(matchInlineMath('$$x = y$$ trailing')).toEqual({
      raw: '$$x = y$$',
      formula: 'x = y',
      display: true
    })
  })

  it('treats an inline \\[…\\] span as display math', () => {
    expect(matchInlineMath('\\[x = y\\] rest')).toEqual({
      raw: '\\[x = y\\]',
      formula: 'x = y',
      display: true
    })
  })

  it('leaves an unterminated or numeric $$ alone', () => {
    expect(matchInlineMath('$$100k of revenue')).toBe(null)
    expect(matchInlineMath('$$x = y with no close')).toBe(null)
  })

  it('only matches at position 0', () => {
    expect(matchInlineMath('text $x$')).toBe(null)
  })

  it('allows punctuation directly after the closing delimiter', () => {
    expect(matchInlineMath('$x$.')).toEqual({ raw: '$x$', formula: 'x', display: false })
    expect(matchInlineMath('$x$, y')).toEqual({ raw: '$x$', formula: 'x', display: false })
  })

  it('takes the shortest valid span', () => {
    expect(matchInlineMath('$a$ plus $b$')).toEqual({ raw: '$a$', formula: 'a', display: false })
  })
})

describe('findDisplayMath', () => {
  it('finds a fenced block spanning several lines', () => {
    const lines = ['$$', '\\sum_{i=1}^n i', '$$', 'after']
    expect(findDisplayMath(lines, 0)).toEqual({
      formula: '\\sum_{i=1}^n i',
      endIndex: 2
    })
  })

  it('finds a single-line block', () => {
    expect(findDisplayMath(['$$x = y$$'], 0)).toEqual({ formula: 'x = y', endIndex: 0 })
  })

  it('finds backslash-bracket blocks', () => {
    expect(findDisplayMath(['\\[', 'x', '\\]'], 0)).toEqual({ formula: 'x', endIndex: 2 })
    expect(findDisplayMath(['\\[x\\]'], 0)).toEqual({ formula: 'x', endIndex: 0 })
  })

  it('returns null for an unterminated block so following markdown survives', () => {
    expect(findDisplayMath(['$$', 'x', '## Still a heading'], 0)).toBe(null)
    expect(findDisplayMath(['\\[', 'x'], 0)).toBe(null)
  })

  it('leaves an amount like $$100k alone', () => {
    expect(findDisplayMath(['$$100k in revenue', '', '$$'], 0)).toBe(null)
  })

  it('returns null when the line does not open display math', () => {
    expect(findDisplayMath(['plain text', '$$'], 0)).toBe(null)
    expect(findDisplayMath(['$x$'], 0)).toBe(null)
  })

  it('starts at the given index', () => {
    const lines = ['intro', '$$', 'x', '$$']
    expect(findDisplayMath(lines, 1)).toEqual({ formula: 'x', endIndex: 3 })
  })

  it('keeps an empty formula out', () => {
    expect(findDisplayMath(['$$', '$$'], 0)).toBe(null)
    expect(findDisplayMath(['$$$$'], 0)).toBe(null)
  })
})
