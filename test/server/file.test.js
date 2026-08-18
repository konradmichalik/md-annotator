import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  isMarkdownFile,
  isPlainTextFile,
  isAnnotatableFile,
  supportedExtensions,
  fileExists,
  readAnnotatableFile,
  resolveAnnotatablePath
} from '../../server/file.js'

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

describe('isPlainTextFile', () => {
  it('accepts config and data formats', () => {
    for (const name of [
      'config.yaml', 'config.yml', 'data.json', 'tsconfig.jsonc', 'a.json5',
      'Cargo.toml', 'php.ini', 'app.cfg', 'nginx.conf', 'app.properties',
      'rows.csv', 'rows.tsv', 'debug.log', 'feed.xml', 'notes.txt', 'notes.text'
    ]) {
      expect(isPlainTextFile(name), name).toBe(true)
    }
  })

  it('accepts .env.example but never a real .env', () => {
    expect(isPlainTextFile('.env.example')).toBe(true)
    expect(isPlainTextFile('/srv/app/.env.example')).toBe(true)
    expect(isPlainTextFile('.env')).toBe(false)
    expect(isPlainTextFile('.env.local')).toBe(false)
    expect(isPlainTextFile('.env.production')).toBe(false)
  })

  it('rejects markdown and source code', () => {
    expect(isPlainTextFile('readme.md')).toBe(false)
    expect(isPlainTextFile('script.js')).toBe(false)
    expect(isPlainTextFile('main.rs')).toBe(false)
    expect(isPlainTextFile('page.html')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isPlainTextFile('DATA.JSON')).toBe(true)
    expect(isPlainTextFile('.ENV.EXAMPLE')).toBe(true)
  })
})

describe('isAnnotatableFile', () => {
  it('covers markdown and plain text alike', () => {
    expect(isAnnotatableFile('readme.md')).toBe(true)
    expect(isAnnotatableFile('config.yaml')).toBe(true)
  })

  it('rejects everything else', () => {
    expect(isAnnotatableFile('script.js')).toBe(false)
    expect(isAnnotatableFile('.env')).toBe(false)
    expect(isAnnotatableFile('image.png')).toBe(false)
  })
})

describe('supportedExtensions', () => {
  it('lists markdown and plain-text formats without .env', () => {
    const list = supportedExtensions()
    expect(list).toContain('.md')
    expect(list).toContain('.yaml')
    expect(list).toContain('.env.example')
    expect(list).not.toContain('.env')
  })
})

describe('readAnnotatableFile', () => {
  it('names the unsupported type and lists what is supported', async () => {
    await expect(readAnnotatableFile('script.js')).rejects.toThrow(/Unsupported file type/)
    await expect(readAnnotatableFile('script.js')).rejects.toThrow(/\.yaml/)
  })

  it('refuses a real .env', async () => {
    await expect(readAnnotatableFile('.env')).rejects.toThrow(/Unsupported file type/)
  })

  it('throws for non-existent files', async () => {
    await expect(readAnnotatableFile('/nonexistent/file.md')).rejects.toThrow('File not found')
  })

  it('reads an existing markdown file', async () => {
    const fixturePath = join(import.meta.dirname, '..', '..', 'README.md')
    const content = await readAnnotatableFile(fixturePath)
    expect(typeof content).toBe('string')
    expect(content.length).toBeGreaterThan(0)
  })

  it('reads a plain-text file', async () => {
    const fixturePath = join(import.meta.dirname, '..', '..', 'package.json')
    const content = await readAnnotatableFile(fixturePath)
    expect(content).toContain('md-annotator')
  })
})

describe('resolveAnnotatablePath', () => {
  const repoRoot = join(import.meta.dirname, '..', '..')

  it('resolves a directory to its README', async () => {
    const resolved = await resolveAnnotatablePath(repoRoot)
    expect(resolved).toBe(join(repoRoot, 'README.md'))
  })

  it('resolves a directory given with a trailing slash', async () => {
    const resolved = await resolveAnnotatablePath(`${repoRoot}/`)
    expect(resolved).toBe(join(repoRoot, 'README.md'))
  })

  it('leaves a file path untouched', async () => {
    const filePath = join(repoRoot, 'README.md')
    expect(await resolveAnnotatablePath(filePath)).toBe(filePath)
  })

  it('returns the directory itself when it holds no index document', async () => {
    const dir = join(repoRoot, 'test', 'fixtures', 'docs')
    expect(await resolveAnnotatablePath(dir)).toBe(dir)
  })

  it('returns a non-existent path unchanged', async () => {
    const missing = join(repoRoot, 'nope', 'missing.md')
    expect(await resolveAnnotatablePath(missing)).toBe(missing)
  })
})
