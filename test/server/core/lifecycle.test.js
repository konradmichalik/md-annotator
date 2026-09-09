import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { withLifecycle } from '../../../server/core/lifecycle.js'

function fakeServer() {
  let resolveWait
  return {
    port: 4321,
    url: 'http://127.0.0.1:4321',
    stop: vi.fn(),
    waitForDecision: () => new Promise((resolve) => { resolveWait = resolve }),
    // Only used by the tests below, never resolved: a real decision from
    // the browser races the signal handler in production but nothing here
    // exercises that race.
    _neverResolve: () => resolveWait
  }
}

describe('withLifecycle', () => {
  let exitSpy

  beforeEach(() => {
    vi.useFakeTimers()
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})
  })

  afterEach(() => {
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGTERM')
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('exposes port, url and waitForDecision from the wrapped server', () => {
    const inner = fakeServer()
    const wrapped = withLifecycle(inner)
    expect(wrapped.port).toBe(4321)
    expect(wrapped.url).toBe('http://127.0.0.1:4321')
    expect(typeof wrapped.waitForDecision).toBe('function')
  })

  it('resolves an aborted decision on SIGINT instead of treating it as approved', async () => {
    const inner = fakeServer()
    const wrapped = withLifecycle(inner)

    process.emit('SIGINT')

    await expect(wrapped.waitForDecision()).resolves.toEqual({ aborted: true })
  })

  it('resolves an aborted decision on SIGTERM', async () => {
    const inner = fakeServer()
    const wrapped = withLifecycle(inner)

    process.emit('SIGTERM')

    await expect(wrapped.waitForDecision()).resolves.toEqual({ aborted: true })
  })

  it('stops the inner server and force-exits after the configured timeout', () => {
    const inner = fakeServer()
    withLifecycle(inner)

    process.emit('SIGINT')

    expect(inner.stop).toHaveBeenCalledOnce()
    expect(exitSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(5000)

    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
