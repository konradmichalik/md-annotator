import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { relative, join } from 'node:path'

const MAX_FILES = 5000
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '__pycache__', '.next', '.cache', '.turbo', '.output'
])

function gitListFiles(cwd) {
  return new Promise((resolve, reject) => {
    execFile('git', ['ls-files'], { cwd, maxBuffer: 10 * 1024 * 1024, timeout: 10_000 }, (err, stdout) => {
      if (err) { return reject(err) }
      const files = stdout.split('\n').filter(Boolean)
      resolve(files.slice(0, MAX_FILES))
    })
  })
}

async function fallbackListFiles(cwd) {
  const entries = await readdir(cwd, { recursive: true, withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (!entry.isFile()) { continue }
    const parentPath = entry.parentPath || entry.path
    const rel = relative(cwd, join(parentPath, entry.name))
    const parts = rel.split('/')
    if (parts.some(p => EXCLUDE_DIRS.has(p))) { continue }
    files.push(rel)
    if (files.length >= MAX_FILES) { break }
  }
  return files.sort()
}

export async function listWorkspaceFiles() {
  const cwd = process.cwd()
  try {
    return await gitListFiles(cwd)
  } catch {
    return await fallbackListFiles(cwd)
  }
}
