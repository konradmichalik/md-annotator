import { describe, it, expect } from 'vitest'
import { isOpenableFileLink } from '../../client/src/utils/links.js'

describe('isOpenableFileLink', () => {
  it('accepts a relative markdown link', () => {
    expect(isOpenableFileLink('route-attribute.md')).toBe(true)
    expect(isOpenableFileLink('./docs/guide.markdown')).toBe(true)
    expect(isOpenableFileLink('../notes.mkd')).toBe(true)
  })

  it('accepts a markdown link with an anchor or query', () => {
    expect(isOpenableFileLink('guide.md#setup')).toBe(true)
    expect(isOpenableFileLink('guide.md?v=2')).toBe(true)
  })

  it('accepts a directory link', () => {
    expect(isOpenableFileLink('docs/routing/')).toBe(true)
    expect(isOpenableFileLink('./docs/routing/')).toBe(true)
    expect(isOpenableFileLink('../')).toBe(true)
    expect(isOpenableFileLink('docs/routing/#usage')).toBe(true)
  })

  it('rejects external links', () => {
    expect(isOpenableFileLink('https://example.com/docs/')).toBe(false)
    expect(isOpenableFileLink('http://example.com/a.md')).toBe(false)
    expect(isOpenableFileLink('mailto:a@b.de')).toBe(false)
    expect(isOpenableFileLink('//example.com/')).toBe(false)
  })

  it('rejects in-document anchors', () => {
    expect(isOpenableFileLink('#section')).toBe(false)
  })

  it('rejects other file types and empty values', () => {
    expect(isOpenableFileLink('image.png')).toBe(false)
    expect(isOpenableFileLink('docs/guide')).toBe(false)
    expect(isOpenableFileLink('')).toBe(false)
    expect(isOpenableFileLink(null)).toBe(false)
  })
})
