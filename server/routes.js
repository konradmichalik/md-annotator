import { Router } from 'express'
import { relative } from 'node:path'
import { readMarkdownFile } from './file.js'
import { exportFeedback } from './feedback.js'

function success(data) {
  return { success: true, data }
}

function failure(error) {
  return { success: false, error }
}

export function createApiRouter(targetFilePath, resolveDecision, origin = 'claude-code') {
  const router = Router()

  router.get('/api/file', async (_req, res) => {
    try {
      const content = await readMarkdownFile(targetFilePath)
      const relativePath = relative(process.cwd(), targetFilePath) || targetFilePath
      res.json(success({ content, path: relativePath, origin }))
    } catch (error) {
      res.status(500).json(failure(error.message))
    }
  })

  router.post('/api/approve', (_req, res) => {
    res.json(success({ message: 'Approved' }))
    setTimeout(() => resolveDecision({ approved: true }), 100)
  })

  router.post('/api/feedback', (req, res) => {
    const { annotations, blocks } = req.body

    if (!Array.isArray(annotations) || !Array.isArray(blocks)) {
      return res.status(400).json(failure('Request body must contain "annotations" and "blocks" arrays'))
    }

    const feedback = exportFeedback(annotations, blocks)
    res.json(success({ message: 'Feedback submitted' }))
    setTimeout(() => resolveDecision({ approved: false, feedback, annotationCount: annotations.length }), 100)
  })

  return router
}
