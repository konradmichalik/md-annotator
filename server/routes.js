import { Router } from 'express'
import { relative, resolve, dirname, isAbsolute } from 'node:path'
import { createHash } from 'node:crypto'
import { readMarkdownFile, isMarkdownFile } from './file.js'
import { exportFeedback, exportMultiFileFeedback } from './feedback.js'

function success(data) {
  return { success: true, data }
}

function failure(error) {
  return { success: false, error }
}

export function createApiRouter(filePaths, resolveDecision, origin = 'claude-code', stores = []) {
  const router = Router()

  // Multi-file endpoint — returns all files
  router.get('/api/files', async (_req, res) => {
    try {
      const files = await Promise.all(
        stores.map(async (store, index) => {
          const content = await readMarkdownFile(store.absolutePath)
          const relativePath = relative(process.cwd(), store.absolutePath) || store.absolutePath
          const currentHash = createHash('sha256').update(content).digest('hex')
          return {
            index,
            path: relativePath,
            content,
            contentHash: currentHash,
            hashMismatch: currentHash !== store.contentHash
          }
        })
      )
      res.json(success({ files, origin }))
    } catch (error) {
      res.status(500).json(failure(error.message))
    }
  })

  // Single-file endpoint — backward compat (returns first file)
  router.get('/api/file', async (_req, res) => {
    try {
      const content = await readMarkdownFile(filePaths[0])
      const relativePath = relative(process.cwd(), filePaths[0]) || filePaths[0]
      res.json(success({
        content,
        path: relativePath,
        origin,
        contentHash: stores[0]?.contentHash || null
      }))
    } catch (error) {
      res.status(500).json(failure(error.message))
    }
  })

  // Open a linked file (linked navigation)
  const baseDir = process.cwd()

  router.get('/api/file/open', async (req, res) => {
    const { path: requestedPath, relativeTo } = req.query
    if (!requestedPath) {
      return res.status(400).json(failure('path query parameter required'))
    }

    const referenceDir = relativeTo
      ? dirname(resolve(baseDir, relativeTo))
      : dirname(filePaths[0])
    const absolutePath = resolve(referenceDir, requestedPath)

    const rel = relative(baseDir, absolutePath)
    if (rel.startsWith('..') || rel === '' || isAbsolute(rel)) {
      return res.status(403).json(failure('Access denied: path outside project directory'))
    }

    if (!isMarkdownFile(absolutePath)) {
      return res.status(400).json(failure('Not a markdown file'))
    }

    try {
      const content = await readMarkdownFile(absolutePath)
      const contentHash = createHash('sha256').update(content).digest('hex')
      const relativePath = relative(baseDir, absolutePath) || absolutePath

      let fileIndex = stores.findIndex(s => s.absolutePath === absolutePath)
      if (fileIndex === -1) {
        stores.push({ absolutePath, contentHash, annotations: [] })
        fileIndex = stores.length - 1
      }

      res.json(success({ index: fileIndex, path: relativePath, content, contentHash }))
    } catch (error) {
      res.status(404).json(failure(error.message))
    }
  })

  // Annotations: scoped by fileIndex query param (default 0)
  router.get('/api/annotations', (req, res) => {
    const fileIndex = parseInt(req.query.fileIndex, 10) || 0
    const store = stores[fileIndex]
    if (!store) {
      return res.json(success({ annotations: [], contentHash: null }))
    }
    res.json(success({
      annotations: store.annotations,
      contentHash: store.contentHash
    }))
  })

  router.post('/api/annotations', (req, res) => {
    const { annotations, fileIndex = 0 } = req.body
    const store = stores[fileIndex]
    if (!store) {
      return res.json(success({ saved: false }))
    }
    if (!Array.isArray(annotations)) {
      return res.status(400).json(failure('annotations must be an array'))
    }
    store.annotations = [...annotations]
    res.json(success({ saved: true, count: annotations.length }))
  })

  router.post('/api/approve', (_req, res) => {
    res.json(success({ message: 'Approved' }))
    setTimeout(() => resolveDecision({ approved: true }), 100)
  })

  router.post('/api/feedback', (req, res) => {
    const { files, annotations, blocks } = req.body

    // Multi-file format
    if (Array.isArray(files)) {
      const feedback = exportMultiFileFeedback(files)
      const totalCount = files.reduce((sum, f) => sum + (f.annotations?.length || 0), 0)
      res.json(success({ message: 'Feedback submitted' }))
      setTimeout(() => resolveDecision({ approved: false, feedback, annotationCount: totalCount }), 100)
      return
    }

    // Single-file backward compat
    if (!Array.isArray(annotations) || !Array.isArray(blocks)) {
      return res.status(400).json(failure('Request body must contain "files" array or "annotations" and "blocks" arrays'))
    }

    const feedback = exportFeedback(annotations, blocks)
    res.json(success({ message: 'Feedback submitted' }))
    setTimeout(() => resolveDecision({ approved: false, feedback, annotationCount: annotations.length }), 100)
  })

  return router
}
