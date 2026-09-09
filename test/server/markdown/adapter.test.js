import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFile, rm } from 'node:fs/promises'
import { describe, it, expect, afterEach } from 'vitest'
import { buildMarkdownServer } from '../../../server/markdown/adapter.js'

describe('buildMarkdownServer', () => {
  const oversizedPath = join(tmpdir(), `annotaitr-oversized-${process.pid}.md`)
  const readablePath = join(tmpdir(), `annotaitr-ok-${process.pid}.md`)
  let server

  afterEach(async () => {
    server?.stop()
    server = null
    await rm(oversizedPath, { force: true })
    await rm(readablePath, { force: true })
  })

  it('rejects startup when the initial file exceeds the size limit', async () => {
    await writeFile(oversizedPath, 'x'.repeat(2 * 1024 * 1024 + 1))
    await expect(
      buildMarkdownServer({ filePaths: [oversizedPath] })
    ).rejects.toThrow(/File too large/)
  })

  it('still starts normally for a readable file', async () => {
    await writeFile(readablePath, '# Hello')
    server = await buildMarkdownServer({ filePaths: [readablePath] })
    expect(server.port).toBeGreaterThan(0)
  })
})
