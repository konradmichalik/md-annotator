import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFile, rm } from 'node:fs/promises'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { loadImageFromFile } from '../../../server/image/loader.js'
import { makeFixturePng } from '../../helpers/fixtureImage.js'

describe('loadImageFromFile', () => {
  const okPath = join(tmpdir(), `annotaitr-ok-${process.pid}.png`)
  const badExtPath = join(tmpdir(), `annotaitr-bad-${process.pid}.gif`)
  const oversizedPath = join(tmpdir(), `annotaitr-big-${process.pid}.png`)

  afterEach(async () => {
    await rm(okPath, { force: true })
    await rm(badExtPath, { force: true })
    await rm(oversizedPath, { force: true })
  })

  it('rejects an unsupported extension before reading the file', async () => {
    await writeFile(badExtPath, Buffer.from('not-an-image'))
    await expect(loadImageFromFile(badExtPath)).rejects.toThrow(/Unsupported image format/)
  })

  it('rejects a file over the byte-size cap before decoding it', async () => {
    // 16 MB of junk bytes, over the 15 MB cap and not valid PNG data. The
    // size check must happen before any decode is attempted, or this test
    // would fail for the wrong reason.
    await writeFile(oversizedPath, Buffer.alloc(16 * 1024 * 1024, 1))
    await expect(loadImageFromFile(oversizedPath)).rejects.toThrow(/too large/)
  })

  it('loads a valid PNG and reports its dimensions', async () => {
    await writeFile(okPath, makeFixturePng(40, 30))
    const result = await loadImageFromFile(okPath)
    expect(result.width).toBe(40)
    expect(result.height).toBe(30)
    expect(Buffer.isBuffer(result.buffer)).toBe(true)
  })
})

vi.mock('playwright', () => {
  const page = {
    goto: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-png-bytes')),
    evaluate: vi.fn().mockResolvedValue({ width: 1920, height: 3000 })
  }
  const browser = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined)
  }
  return {
    chromium: {
      launch: vi.fn().mockResolvedValue(browser)
    },
    __mockPage: page,
    __mockBrowser: browser
  }
})

describe('captureUrl', () => {
  it('returns the screenshot buffer and page dimensions', async () => {
    const { captureUrl } = await import('../../../server/image/loader.js')
    const result = await captureUrl('http://localhost:3000', { width: 1920, height: 1080 })
    expect(result.buffer).toEqual(Buffer.from('fake-png-bytes'))
    expect(result.width).toBe(1920)
    expect(result.height).toBe(3000)
  })

  it('closes the browser even when navigation fails', async () => {
    const playwright = await import('playwright')
    playwright.__mockPage.goto.mockRejectedValueOnce(new Error('net::ERR_CONNECTION_REFUSED'))
    const { captureUrl } = await import('../../../server/image/loader.js')
    await expect(captureUrl('http://localhost:9999', { width: 1920, height: 1080 })).rejects.toThrow(
      /ERR_CONNECTION_REFUSED/
    )
    expect(playwright.__mockBrowser.close).toHaveBeenCalled()
  })

  it('rejects a non-http(s) URL before launching a browser', async () => {
    const playwright = await import('playwright')
    playwright.chromium.launch.mockClear()
    const { captureUrl } = await import('../../../server/image/loader.js')
    await expect(captureUrl('file:///etc/passwd', { width: 1920, height: 1080 })).rejects.toThrow(
      /Unsupported URL/
    )
    expect(playwright.chromium.launch).not.toHaveBeenCalled()
  })

  it('rejects a screenshot over the byte-size cap and still closes the browser', async () => {
    const playwright = await import('playwright')
    playwright.__mockPage.screenshot.mockResolvedValueOnce(Buffer.alloc(16 * 1024 * 1024, 1))
    const { captureUrl } = await import('../../../server/image/loader.js')
    await expect(captureUrl('http://localhost:3000', { width: 1920, height: 1080 })).rejects.toThrow(/too large/)
    expect(playwright.__mockBrowser.close).toHaveBeenCalled()
  })

  it('rejects a screenshot over the pixel-dimension cap and still closes the browser', async () => {
    const playwright = await import('playwright')
    playwright.__mockPage.evaluate.mockResolvedValueOnce({ width: 1920, height: 25000 })
    const { captureUrl } = await import('../../../server/image/loader.js')
    await expect(captureUrl('http://localhost:3000', { width: 1920, height: 1080 })).rejects.toThrow(
      /dimensions too large/
    )
    expect(playwright.__mockBrowser.close).toHaveBeenCalled()
  })
})
