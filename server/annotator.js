/**
 * Annotator server module.
 * Provides startAnnotatorServer() for both CLI and plugin usage.
 */

import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { createApiRouter } from './routes.js'
import { readMarkdownFile } from './file.js'
import { convertNotesToAnnotations } from './notes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_PATH = join(__dirname, '..', 'client', 'dist')
const DEV_PATH = join(__dirname, '..', 'client')

// Pre-load index.html into memory at module load time (avoids per-request disk I/O)
const DIST_INDEX = join(DIST_PATH, 'index.html')
const DEV_INDEX = join(DEV_PATH, 'index.html')
const preloadedHtml = existsSync(DIST_INDEX)
  ? readFileSync(DIST_INDEX, 'utf-8')
  : existsSync(DEV_INDEX)
    ? readFileSync(DEV_INDEX, 'utf-8')
    : null

/**
 * Resolve notes for a specific file from the feedbackNotes array.
 * Notes apply to the first file only (multi-file uses one invocation per file).
 */
function resolveNotesForFile(feedbackNotes, fileIndex, content) {
  if (!Array.isArray(feedbackNotes) || fileIndex !== 0) {
    return []
  }
  return convertNotesToAnnotations(feedbackNotes, content)
}

/**
 * Start the annotator server with configurable options.
 *
 * @param {Object} options - Server configuration
 * @param {string} [options.filePath] - Absolute path to markdown file (single-file compat)
 * @param {string[]} [options.filePaths] - Array of absolute paths to markdown files
 * @param {string} [options.origin='cli'] - Origin identifier ('cli' | 'claude-code' | 'opencode')
 * @param {string} [options.htmlContent] - Embedded HTML content (for plugin usage)
 * @param {Function} [options.onReady] - Callback when server is ready: (url, port) => void
 * @returns {Promise<Object>} Server control object
 */
export async function startAnnotatorServer(options) {
  const {
    filePath,
    filePaths: filePathsOpt,
    origin = 'cli',
    htmlContent = null,
    onReady = null,
    feedbackNotes = null,
  } = options

  const filePaths = filePathsOpt || (filePath ? [filePath] : [])

  const app = express()

  // Middleware
  app.use(cors())
  app.use(express.json({ limit: config.jsonLimit }))

  // Serve HTML from memory (pre-loaded or embedded)
  const html = htmlContent || preloadedHtml
  if (html) {
    app.get('/', (_req, res) => {
      res.type('html').send(html)
    })
  } else {
    // Fallback: serve from disk (dev mode without built index.html)
    const clientPath = existsSync(DIST_PATH) ? DIST_PATH : DEV_PATH
    app.use(express.static(clientPath))
  }

  // Serve static files from markdown file directories (for relative images, etc.)
  const servedDirs = new Set()
  for (const fp of filePaths) {
    const dir = dirname(fp)
    if (!servedDirs.has(dir)) {
      servedDirs.add(dir)
      app.use(express.static(dir))
    }
  }

  // Fallback: also serve from cwd for absolute-style paths
  if (!servedDirs.has(process.cwd())) {
    app.use(express.static(process.cwd()))
  }

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

  // Compute content hash per file for annotation persistence
  const stores = await Promise.all(
    filePaths.map(async (fp, index) => {
      try {
        const content = await readMarkdownFile(fp)
        const contentHash = createHash('sha256').update(content).digest('hex')
        const notes = resolveNotesForFile(feedbackNotes, index, content)
        return { absolutePath: fp, contentHash, annotations: notes }
      } catch (_e) {
        return { absolutePath: fp, contentHash: null, annotations: [] }
      }
    })
  )

  // Decision promise with guard against double resolution
  let resolveDecision
  let decided = false
  const decisionPromise = new Promise((resolve) => {
    resolveDecision = resolve
  })

  function safeResolve(value) {
    if (decided) {return}
    decided = true
    resolveDecision(value)
  }

  // API routes with multi-file support
  app.use(createApiRouter(filePaths, safeResolve, origin, stores))

  // Start server — use port 0 to let the OS assign a free port instantly,
  // falling back to configured port if explicitly set via MD_ANNOTATOR_PORT
  const requestedPort = config.portExplicit ? config.port : 0
  const server = await new Promise((resolve) => {
    const s = app.listen(requestedPort, () => resolve(s))
  })

  const port = server.address().port
  const url = `http://localhost:${port}`

  // Call onReady callback if provided
  if (onReady) {
    onReady(url, port)
  }

  // Heartbeat monitor — resolve as disconnected if client goes silent
  const heartbeatInterval = setInterval(() => {
    if (heartbeatReceived && Date.now() - lastHeartbeat > config.heartbeatTimeoutMs) {
      clearInterval(heartbeatInterval)
      safeResolve({ disconnected: true })
    }
  }, 5000)
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
