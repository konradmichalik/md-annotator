import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

describe('claude-code plugin manifest', () => {
  it('is valid JSON with the required fields', () => {
    const raw = readFileSync('apps/claude-code/.claude-plugin/plugin.json', 'utf-8')
    const manifest = JSON.parse(raw)
    expect(manifest.name).toBe('annotate')
    expect(manifest.commands).toBe('./commands/')
    expect(typeof manifest.description).toBe('string')
  })

  it('exposes /annotate:md, /annotate:image and /annotate:review, all shelling out to annotaitr', () => {
    for (const command of ['md', 'image', 'review']) {
      const content = readFileSync(`apps/claude-code/commands/${command}.md`, 'utf-8')
      expect(content).toContain('annotaitr --origin claude-code')
    }
  })
})

describe('marketplace manifest', () => {
  it('lists the plugin at the path the plugin manifest lives in', () => {
    const marketplace = JSON.parse(readFileSync('.claude-plugin/marketplace.json', 'utf-8'))
    expect(marketplace.name).toBe('annotaitr')
    expect(marketplace.plugins).toHaveLength(1)
    expect(marketplace.plugins[0].name).toBe('annotate')
    expect(marketplace.plugins[0].source).toBe('./apps/claude-code')
  })
})
