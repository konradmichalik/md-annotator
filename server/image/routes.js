import { Router } from 'express'
import { flattenAnnotations } from './render.js'
import { writeAnnotatedImage } from './output.js'
import { formatApprovalOutput, formatApprovalWithNotesOutput, exportFeedback } from './feedback.js'

function success(data) { return { success: true, data } }
function failure(error) { return { success: false, error } }

export function createApiRouter({ imageBuffer, imageWidth, imageHeight, origin, targetLabel, state, resolveDecision }) {
  const router = Router()

  router.get('/api/image', (_req, res) => {
    res.type('png').send(imageBuffer)
  })

  router.get('/api/meta', (_req, res) => {
    res.json(success({ width: imageWidth, height: imageHeight, origin, targetLabel }))
  })

  router.get('/api/annotations', (_req, res) => {
    res.json(success({ annotations: state.annotations }))
  })

  router.post('/api/annotations', (req, res) => {
    const { annotations } = req.body
    if (!Array.isArray(annotations)) {
      return res.status(400).json(failure('annotations must be an array'))
    }
    state.annotations = [...annotations]
    res.json(success({ saved: true, count: annotations.length }))
  })

  router.post('/api/approve', async (_req, res) => {
    if (state.annotations.length === 0) {
      res.json(success({ message: 'Approved' }))
      setTimeout(() => resolveDecision({ approved: true, output: formatApprovalOutput() }), 100)
      return
    }
    try {
      const flattened = await flattenAnnotations(imageBuffer, state.annotations)
      const annotatedImagePath = await writeAnnotatedImage(flattened)
      const output = formatApprovalWithNotesOutput(state.annotations, imageWidth, imageHeight, annotatedImagePath)
      res.json(success({ message: 'Approved with notes' }))
      setTimeout(
        () => resolveDecision({ approved: true, output, annotationCount: state.annotations.length }),
        100
      )
    } catch (error) {
      console.error(error)
      res.status(500).json(failure(error.message))
    }
  })

  router.post('/api/submit', async (_req, res) => {
    if (state.annotations.length === 0) {
      return res.status(400).json(failure('No annotations to submit: use Approve instead'))
    }
    try {
      const flattened = await flattenAnnotations(imageBuffer, state.annotations)
      const annotatedImagePath = await writeAnnotatedImage(flattened)
      const output = exportFeedback(state.annotations, imageWidth, imageHeight, annotatedImagePath)
      res.json(success({ message: 'Feedback submitted' }))
      setTimeout(
        () => resolveDecision({ approved: false, output, annotationCount: state.annotations.length }),
        100
      )
    } catch (error) {
      console.error(error)
      res.status(500).json(failure(error.message))
    }
  })

  return router
}
