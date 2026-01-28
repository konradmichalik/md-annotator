/**
 * Express server with Promise-based decision flow.
 * Waits for user to click Approve or Submit Feedback in the browser.
 */

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import express from 'express'
import cors from 'cors'
import portfinder from 'portfinder'
import { config } from './config.js'
import { createApiRouter } from './routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_PATH = join(__dirname, '..', 'client', 'dist')
const DEV_PATH = join(__dirname, '..', 'client')
const CLIENT_PATH = existsSync(DIST_PATH) ? DIST_PATH : DEV_PATH

/**
 * Create and start the annotation server.
 * Returns an object with port, waitForDecision(), and shutdown().
 */
export async function createServer(targetFilePath) {
  const app = express()

  // Middleware
  app.use(cors())
  app.use(express.json({ limit: config.jsonLimit }))
  app.use(express.static(CLIENT_PATH))

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Decision promise — resolves when user submits decision
  let resolveDecision
  const decisionPromise = new Promise((resolve) => {
    resolveDecision = resolve
  })

  // API routes
  app.use(createApiRouter(targetFilePath, resolveDecision))

  // Find available port
  portfinder.basePort = config.port
  const port = await portfinder.getPortPromise()

  // Start server
  const server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s))
  })

  // Shutdown handler
  function shutdown() {
    server.close()
    setTimeout(() => process.exit(1), config.forceExitTimeoutMs)
  }

  // Graceful shutdown on signals
  process.on('SIGTERM', () => {
    resolveDecision({ approved: true })
    shutdown()
  })
  process.on('SIGINT', () => {
    resolveDecision({ approved: true })
    shutdown()
  })

  return {
    port,
    waitForDecision: () => decisionPromise,
    shutdown,
  }
}
