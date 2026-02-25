import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { isMarkdownFile, fileExists, readMarkdownFile } from '../../server/file.js'

describe('isMarkdownFile', () => {
  it('accepts .md extension', () => {
    expect(isMarkdownFile('readme.md')).toBe(true)
  })

  it('accepts .markdown extension', () => {
    expect(isMarkdownFile('doc.markdown')).toBe(true)
  })

  it('accepts .mdown extension', () => {
    expect(isMarkdownFile('notes.mdown')).toBe(true)
  })

  it('accepts .mkd extension', () => {
    expect(isMarkdownFile('file.mkd')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isMarkdownFile('README.MD')).toBe(true)
    expect(isMarkdownFile('file.Markdown')).toBe(true)
  })

  it('rejects .txt files', () => {
    expect(isMarkdownFile('file.txt')).toBe(false)
  })

  it('rejects .html files', () => {
    expect(isMarkdownFile('page.html')).toBe(false)
  })

  it('rejects .js files', () => {
    expect(isMarkdownFile('script.js')).toBe(false)
  })

  it('rejects files without extension', () => {
    expect(isMarkdownFile('README')).toBe(false)
  })

  it('handles paths with directories', () => {
    expect(isMarkdownFile('/usr/local/docs/readme.md')).toBe(true)
    expect(isMarkdownFile('/usr/local/docs/readme.txt')).toBe(false)
  })
})

describe('fileExists', () => {
  it('returns true for existing files', async () => {
    const result = await fileExists(join(import.meta.dirname, 'file.test.js'))
    expect(result).toBe(true)
  })

  it('returns false for non-existing files', async () => {
    const result = await fileExists('/nonexistent/path/file.md')
    expect(result).toBe(false)
  })
})

describe('readMarkdownFile', () => {
  it('throws for non-markdown files', async () => {
    await expect(readMarkdownFile('file.txt')).rejects.toThrow('Not a Markdown file')
  })

  it('throws for non-existent markdown files', async () => {
    await expect(readMarkdownFile('/nonexistent/file.md')).rejects.toThrow('File not found')
  })

  it('reads an existing markdown file', async () => {
    const fixturePath = join(import.meta.dirname, '..', '..', 'README.md')
    const content = await readMarkdownFile(fixturePath)
    expect(typeof content).toBe('string')
    expect(content.length).toBeGreaterThan(0)
  })
})
