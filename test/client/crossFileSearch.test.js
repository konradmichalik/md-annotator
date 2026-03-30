import { describe, it, expect } from 'vitest'
import { searchAcrossFiles } from '../../client/src/utils/crossFileSearch.js'

describe('searchAcrossFiles', () => {
  const files = [
    { path: '/docs/readme.md', content: 'Hello world\nThis is a test file.\nHello again.' },
    { path: '/docs/guide.md', content: 'Guide to the system.\nNothing here.' },
    { path: '/docs/faq.md', content: 'Frequently asked questions.\nHello from FAQ.' },
  ]

  it('returns empty array for empty query', () => {
    expect(searchAcrossFiles(files, '')).toEqual([])
  })

  it('returns empty array for null files', () => {
    expect(searchAcrossFiles(null, 'hello')).toEqual([])
  })

  it('finds matches across multiple files', () => {
    const results = searchAcrossFiles(files, 'hello')
    expect(results).toHaveLength(2)
    expect(results[0].fileIndex).toBe(0)
    expect(results[0].matches).toHaveLength(2)
    expect(results[1].fileIndex).toBe(2)
    expect(results[1].matches).toHaveLength(1)
  })

  it('returns correct line numbers', () => {
    const results = searchAcrossFiles(files, 'hello')
    expect(results[0].matches[0].line).toBe(1)
    expect(results[0].matches[1].line).toBe(3)
    expect(results[1].matches[0].line).toBe(2)
  })

  it('is case-insensitive', () => {
    const results = searchAcrossFiles(files, 'HELLO')
    expect(results).toHaveLength(2)
    expect(results[0].matches).toHaveLength(2)
  })

  it('returns no results when query not found', () => {
    const results = searchAcrossFiles(files, 'xyz123')
    expect(results).toEqual([])
  })

  it('includes file path in results', () => {
    const results = searchAcrossFiles(files, 'guide')
    expect(results).toHaveLength(1)
    expect(results[0].filePath).toBe('/docs/guide.md')
  })

  it('includes context snippets', () => {
    const results = searchAcrossFiles(files, 'test')
    expect(results[0].matches[0].context).toContain('test')
  })

  it('handles single-file input', () => {
    const results = searchAcrossFiles([files[0]], 'hello')
    expect(results).toHaveLength(1)
    expect(results[0].matches).toHaveLength(2)
  })

  it('handles files with empty content', () => {
    const emptyFiles = [{ path: '/empty.md', content: '' }]
    const results = searchAcrossFiles(emptyFiles, 'test')
    expect(results).toEqual([])
  })
})
