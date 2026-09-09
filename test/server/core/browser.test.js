import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined)
}))

describe('openBrowser', () => {
  afterEach(() => {
    delete process.env.ANNOTAITR_NO_OPEN
    delete process.env.IMG_ANNOTATOR_NO_OPEN
    vi.clearAllMocks()
  })

  it('does not open a real browser tab when ANNOTAITR_NO_OPEN is set', async () => {
    process.env.ANNOTAITR_NO_OPEN = '1'
    const open = (await import('open')).default
    const { openBrowser } = await import('../../../server/core/browser.js')
    await expect(openBrowser('http://example.com')).resolves.toBeUndefined()
    expect(open).not.toHaveBeenCalled()
  })

  it('still honors the deprecated IMG_ANNOTATOR_NO_OPEN name', async () => {
    process.env.IMG_ANNOTATOR_NO_OPEN = '1'
    const open = (await import('open')).default
    const { openBrowser } = await import('../../../server/core/browser.js')
    await expect(openBrowser('http://example.com')).resolves.toBeUndefined()
    expect(open).not.toHaveBeenCalled()
  })

  it('opens the browser when the guard is not set', async () => {
    const open = (await import('open')).default
    const { openBrowser } = await import('../../../server/core/browser.js')
    await openBrowser('http://example.com')
    expect(open).toHaveBeenCalledWith('http://example.com', expect.any(Object))
  })
})
