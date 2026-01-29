/**
 * Express server with Promise-based decision flow.
 * Waits for user to click Approve or Submit Feedback in the browser.
 */

import { startAnnotatorServer } from './annotator.js'
import { config } from './config.js'

// Re-export for plugin usage
export { startAnnotatorServer } from './annotator.js'

/**
 * Create and start the annotation server (CLI compatibility wrapper).
 * Returns an object with port, waitForDecision(), and shutdown().
 */
export async function createServer(targetFilePath) {
  let resolveDecision

  const server = await startAnnotatorServer({
    filePath: targetFilePath,
    origin: 'claude-code',
  })

  // Create a wrapper promise that can be resolved by signals
  const decisionPromise = new Promise((resolve) => {
    resolveDecision = resolve
    // Forward the actual decision
    server.waitForDecision().then(resolve)
  })

  // Shutdown handler
  function shutdown() {
    server.stop()
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
    port: server.port,
    waitForDecision: () => decisionPromise,
    shutdown,
  }
}
