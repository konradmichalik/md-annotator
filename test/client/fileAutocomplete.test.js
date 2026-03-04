import { describe, it, expect } from 'vitest'
import { detectTrigger, filterFiles, insertFileReference } from '../../client/src/hooks/useFileAutocomplete.js'
import { parseFileReferences } from '../../client/src/components/FileReferenceText.jsx'

describe('detectTrigger', () => {
  it('detects @ at start of text', () => {
    expect(detectTrigger('@foo', 4)).toEqual({ triggerIndex: 0, query: 'foo' })
  })

  it('detects @ after whitespace', () => {
    expect(detectTrigger('hello @bar', 10)).toEqual({ triggerIndex: 6, query: 'bar' })
  })

  it('ignores @ mid-word', () => {
    expect(detectTrigger('email@test', 10)).toBeNull()
  })

  it('returns null with no @', () => {
    expect(detectTrigger('hello', 5)).toBeNull()
  })

  it('returns empty query when cursor is right after @', () => {
    expect(detectTrigger('@', 1)).toEqual({ triggerIndex: 0, query: '' })
  })

  it('detects @ after newline', () => {
    expect(detectTrigger('line1\n@foo', 10)).toEqual({ triggerIndex: 6, query: 'foo' })
  })

  it('returns null when query contains newline', () => {
    expect(detectTrigger('@foo\nbar', 8)).toBeNull()
  })

  it('returns null when cursor is at position 0', () => {
    expect(detectTrigger('@foo', 0)).toBeNull()
  })

  it('detects @ after tab', () => {
    expect(detectTrigger('\t@src', 5)).toEqual({ triggerIndex: 1, query: 'src' })
  })
})

describe('filterFiles', () => {
  const files = ['src/App.jsx', 'src/utils/parser.js', 'package.json', 'README.md']

  it('returns first N items when query is empty', () => {
    const result = filterFiles(files, '')
    expect(result).toEqual(files)
  })

  it('filters by substring match', () => {
    const result = filterFiles(files, 'src')
    expect(result).toEqual(['src/App.jsx', 'src/utils/parser.js'])
  })

  it('is case-insensitive', () => {
    const result = filterFiles(files, 'readme')
    expect(result).toContain('README.md')
  })

  it('prioritizes prefix matches', () => {
    const result = filterFiles(files, 'pack')
    expect(result[0]).toBe('package.json')
  })

  it('returns empty array when nothing matches', () => {
    expect(filterFiles(files, 'zzz')).toEqual([])
  })

  it('limits results to 10', () => {
    const manyFiles = Array.from({ length: 20 }, (_, i) => `file${i}.js`)
    const result = filterFiles(manyFiles, '')
    expect(result.length).toBe(10)
  })
})

describe('insertFileReference', () => {
  it('replaces @query with @filepath', () => {
    const result = insertFileReference('hello @sr', 6, 9, 'src/App.jsx')
    expect(result.newValue).toBe('hello @src/App.jsx')
    expect(result.newCursorPos).toBe(18)
  })

  it('adds space before remaining text', () => {
    const result = insertFileReference('@sr is good', 0, 3, 'src/App.jsx')
    expect(result.newValue).toBe('@src/App.jsx is good')
  })

  it('handles @ at end of text', () => {
    const result = insertFileReference('see @', 4, 5, 'README.md')
    expect(result.newValue).toBe('see @README.md')
  })

  it('does not add extra space when next char is space', () => {
    const result = insertFileReference('@sr more', 0, 3, 'src/App.jsx')
    expect(result.newValue).toBe('@src/App.jsx more')
  })

  it('handles empty text before @', () => {
    const result = insertFileReference('@', 0, 1, 'index.js')
    expect(result.newValue).toBe('@index.js')
    expect(result.newCursorPos).toBe(9)
  })
})

describe('parseFileReferences', () => {
  it('returns null for text without @-references', () => {
    expect(parseFileReferences('hello world')).toBeNull()
  })

  it('returns null for empty text', () => {
    expect(parseFileReferences('')).toBeNull()
    expect(parseFileReferences(null)).toBeNull()
  })

  it('parses a single @-reference', () => {
    const parts = parseFileReferences('see @src/App.jsx')
    expect(parts).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'ref', value: 'src/App.jsx' }
    ])
  })

  it('parses multiple @-references', () => {
    const parts = parseFileReferences('@a.js and @b.js')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toEqual({ type: 'ref', value: 'a.js' })
    expect(parts[1]).toEqual({ type: 'text', value: ' and ' })
    expect(parts[2]).toEqual({ type: 'ref', value: 'b.js' })
  })

  it('ignores email-like @ (mid-word)', () => {
    expect(parseFileReferences('user@example.com')).toBeNull()
  })

  it('parses @-reference at start of text', () => {
    const parts = parseFileReferences('@README.md is the file')
    expect(parts[0]).toEqual({ type: 'ref', value: 'README.md' })
  })
})
