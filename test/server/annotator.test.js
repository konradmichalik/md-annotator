import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFile, rm } from 'node:fs/promises'
import { describe, it, expect, afterEach } from 'vitest'
import { startAnnotatorServer } from '../../server/annotator.js'

describe('startAnnotatorServer', () => {
  const oversizedPath = join(tmpdir(), `md-annotator-oversized-${process.pid}.md`)
  const readablePath = join(tmpdir(), `md-annotator-ok-${process.pid}.md`)
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
      startAnnotatorServer({ filePaths: [oversizedPath] })
    ).rejects.toThrow(/File too large/)
  })

  it('still starts normally for a readable file', async () => {
    await writeFile(readablePath, '# Hello')
    server = await startAnnotatorServer({ filePaths: [readablePath] })
    expect(server.port).toBeGreaterThan(0)
  })
})
