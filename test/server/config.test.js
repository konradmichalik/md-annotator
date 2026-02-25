import { describe, it, expect } from 'vitest'
import { config } from '../../server/config.js'

describe('config', () => {
  it('has expected shape', () => {
    expect(config).toHaveProperty('port')
    expect(config).toHaveProperty('browser')
    expect(config).toHaveProperty('forceExitTimeoutMs')
    expect(config).toHaveProperty('jsonLimit')
  })

  it('port is a number', () => {
    expect(typeof config.port).toBe('number')
    expect(config.port).toBeGreaterThan(0)
    expect(config.port).toBeLessThan(65536)
  })

  it('has sensible defaults', () => {
    expect(config.forceExitTimeoutMs).toBe(5000)
    expect(config.jsonLimit).toBe('10mb')
  })

  it('browser defaults to null when env not set', () => {
    if (!process.env.MD_ANNOTATOR_BROWSER) {
      expect(config.browser).toBeNull()
    }
  })
})
