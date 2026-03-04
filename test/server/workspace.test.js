import { describe, it, expect } from 'vitest'
import { listWorkspaceFiles } from '../../server/workspace.js'

describe('listWorkspaceFiles', () => {
  it('returns an array of file paths', async () => {
    const files = await listWorkspaceFiles()
    expect(Array.isArray(files)).toBe(true)
    expect(files.length).toBeGreaterThan(0)
  })

  it('returns relative paths without leading ./', async () => {
    const files = await listWorkspaceFiles()
    for (const f of files) {
      expect(f).not.toMatch(/^\.\//)
      expect(f).not.toMatch(/^\//)
    }
  })

  it('does not include node_modules', async () => {
    const files = await listWorkspaceFiles()
    const hasNodeModules = files.some(f => f.includes('node_modules'))
    expect(hasNodeModules).toBe(false)
  })

  it('includes known project files', async () => {
    const files = await listWorkspaceFiles()
    expect(files).toContain('package.json')
    expect(files).toContain('server/routes.js')
  })
})
