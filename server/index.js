import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import express from 'express'
import cors from 'cors'
import portfinder from 'portfinder'
import { createApiRouter } from './routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_PATH = join(__dirname, '..', 'client', 'dist')
const DEV_PATH = join(__dirname, '..', 'client')
const CLIENT_PATH = existsSync(DIST_PATH) ? DIST_PATH : DEV_PATH

const FORCE_EXIT_TIMEOUT_MS = 5000

export async function startServer(targetFilePath) {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.static(CLIENT_PATH))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Decision promise — resolves when user clicks Approve or Submit Feedback
  let resolveDecision
  const decisionPromise = new Promise((resolve) => {
    resolveDecision = resolve
  })

  const apiRouter = createApiRouter(targetFilePath, resolveDecision)
  app.use(apiRouter)

  const basePort = parseInt(process.env.PORT, 10) || 3000
  portfinder.basePort = basePort
  const port = await portfinder.getPortPromise()

  const server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s))
  })

  // Graceful shutdown after decision
  function shutdown() {
    server.close()
    setTimeout(() => process.exit(1), FORCE_EXIT_TIMEOUT_MS)
  }

  process.on('SIGTERM', () => {
    resolveDecision({ approved: true })
    shutdown()
  })
  process.on('SIGINT', () => {
    resolveDecision({ approved: true })
    shutdown()
  })

  return { port, decisionPromise, shutdown }
}
