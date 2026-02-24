/**
 * Annotator server module.
 * Provides startAnnotatorServer() for both CLI and plugin usage.
 */

import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import express from 'express'
import cors from 'cors'
import portfinder from 'portfinder'
import { config } from './config.js'
import { createApiRouter } from './routes.js'
import { readMarkdownFile } from './file.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_PATH = join(__dirname, '..', 'client', 'dist')
const DEV_PATH = join(__dirname, '..', 'client')

/**
 * Start the annotator server with configurable options.
 *
 * @param {Object} options - Server configuration
 * @param {string} options.filePath - Absolute path to markdown file
 * @param {string} [options.origin='claude-code'] - Origin identifier ('claude-code' | 'opencode')
 * @param {string} [options.htmlContent] - Embedded HTML content (for plugin usage)
 * @param {Function} [options.onReady] - Callback when server is ready: (url, port) => void
 * @returns {Promise<Object>} Server control object
 */
export async function startAnnotatorServer(options) {
  const {
    filePath,
    origin = 'claude-code',
    htmlContent = null,
    onReady = null,
  } = options

  const app = express()

  // Middleware
  app.use(cors())
  app.use(express.json({ limit: config.jsonLimit }))

  // Serve static files or embedded HTML
  if (htmlContent) {
    // Plugin mode: serve embedded HTML
    app.get('/', (_req, res) => {
      res.type('html').send(htmlContent)
    })
  } else {
    // CLI mode: serve from disk
    const clientPath = existsSync(DIST_PATH) ? DIST_PATH : DEV_PATH
    app.use(express.static(clientPath))
  }

  // Serve static files from project directory (for images, etc.)
  app.use(express.static(process.cwd()))

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Client heartbeat — detect browser tab close
  let lastHeartbeat = 0
  let heartbeatReceived = false

  app.post('/api/heartbeat', (_req, res) => {
    lastHeartbeat = Date.now()
    heartbeatReceived = true
    res.json({ status: 'ok' })
  })

  // Compute content hash for annotation persistence
  let annotationStore = null
  try {
    const content = await readMarkdownFile(filePath)
    const contentHash = createHash('sha256').update(content).digest('hex')
    annotationStore = { contentHash, annotations: [] }
  } catch (_e) {
    // Hash computation failed — persistence disabled for this session
  }

  // Decision promise
  let resolveDecision
  const decisionPromise = new Promise((resolve) => {
    resolveDecision = resolve
  })

  // API routes with origin support and annotation store
  app.use(createApiRouter(filePath, resolveDecision, origin, annotationStore))

  // Find available port
  portfinder.basePort = config.port
  const port = await portfinder.getPortPromise()

  // Start server
  const server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s))
  })

  const url = `http://localhost:${port}`

  // Call onReady callback if provided
  if (onReady) {
    onReady(url, port)
  }

  // Heartbeat monitor — resolve as disconnected if client goes silent
  const heartbeatInterval = setInterval(() => {
    if (heartbeatReceived && Date.now() - lastHeartbeat > 6000) {
      clearInterval(heartbeatInterval)
      resolveDecision({ disconnected: true })
    }
  }, 3000)
  heartbeatInterval.unref()

  // Stop function
  function stop() {
    clearInterval(heartbeatInterval)
    server.close()
  }

  return {
    port,
    url,
    waitForDecision: () => decisionPromise,
    stop,
  }
}
