import { describe, it, expect } from 'vitest'
import { config, parseViewportSpec, VIEWPORT_PRESETS } from '../../../server/image/config.js'

describe('image config', () => {
  it('has expected shape', () => {
    expect(config).toHaveProperty('captureTimeoutMs')
    expect(config).toHaveProperty('maxImageBytes')
    expect(config).toHaveProperty('maxImageDimension')
  })
})

describe('parseViewportSpec', () => {
  it('defaults to desktop when no spec is given', () => {
    expect(parseViewportSpec(null)).toEqual(VIEWPORT_PRESETS.desktop)
  })

  it('resolves known presets case-insensitively', () => {
    expect(parseViewportSpec('mobile')).toEqual(VIEWPORT_PRESETS.mobile)
    expect(parseViewportSpec('MOBILE')).toEqual(VIEWPORT_PRESETS.mobile)
  })

  it('parses an explicit WxH', () => {
    expect(parseViewportSpec('1024x768')).toEqual({ width: 1024, height: 768 })
  })

  it('returns null for an unrecognized spec', () => {
    expect(parseViewportSpec('ultrawide')).toBeNull()
    expect(parseViewportSpec('0x0')).toBeNull()
  })
})
