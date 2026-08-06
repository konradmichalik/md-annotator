import { describe, it, expect } from 'vitest'
import { config, parsePortSpec } from '../../server/config.js'

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

describe('parsePortSpec', () => {
  it('parses a single port', () => {
    expect(parsePortSpec('3000')).toEqual([3000])
  })

  it('parses an inclusive range in order', () => {
    expect(parsePortSpec('19432-19435')).toEqual([19432, 19433, 19434, 19435])
  })

  it('accepts a range with surrounding whitespace and spaces around the dash', () => {
    expect(parsePortSpec('  3000 - 3002 ')).toEqual([3000, 3001, 3002])
  })

  it('treats a single-port range as one candidate', () => {
    expect(parsePortSpec('3000-3000')).toEqual([3000])
  })

  it('caps an absurd range instead of scanning every port', () => {
    const ports = parsePortSpec('1-65535')
    expect(ports).toHaveLength(256)
    expect(ports[0]).toBe(1)
    expect(ports[255]).toBe(256)
  })

  it('rejects a reversed range', () => {
    expect(parsePortSpec('3010-3000')).toBe(null)
  })

  it('rejects out-of-range ports', () => {
    expect(parsePortSpec('0')).toBe(null)
    expect(parsePortSpec('65536')).toBe(null)
    expect(parsePortSpec('3000-70000')).toBe(null)
  })

  it('rejects garbage', () => {
    expect(parsePortSpec('abc')).toBe(null)
    expect(parsePortSpec('3000abc')).toBe(null)
    expect(parsePortSpec('3000-')).toBe(null)
    expect(parsePortSpec('-3000')).toBe(null)
    expect(parsePortSpec('3000-3010-3020')).toBe(null)
  })

  it('returns null for missing or empty input', () => {
    expect(parsePortSpec(undefined)).toBe(null)
    expect(parsePortSpec('')).toBe(null)
    expect(parsePortSpec('   ')).toBe(null)
  })
})

describe('config.ports', () => {
  it('always exposes a non-empty candidate list starting with config.port', () => {
    expect(Array.isArray(config.ports)).toBe(true)
    expect(config.ports.length).toBeGreaterThan(0)
    expect(config.ports[0]).toBe(config.port)
  })
})
