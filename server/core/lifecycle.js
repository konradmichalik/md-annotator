/**
 * Wraps a running annotator server with SIGINT/SIGTERM handling, so the CLI
 * exits cleanly instead of hanging when the user interrupts it.
 *
 * Note: markdown-annotator's pre-merge `createServer` wrapper resolved an
 * interrupted session as `{ approved: true }`, reporting a Ctrl+C to the
 * calling agent as an approval. This resolves `{ aborted: true }` instead, so
 * the CLI can exit non-zero and the agent can tell an interrupt apart from a
 * real decision.
 */

import { config } from './config.js'

export function withLifecycle(server) {
  let resolveDecision
  const decisionPromise = new Promise((resolve) => {
    resolveDecision = resolve
    server.waitForDecision().then(resolve)
  })

  let shuttingDown = false
  function shutdown() {
    if (shuttingDown) { return }
    shuttingDown = true
    server.stop()
    setTimeout(() => process.exit(1), config.forceExitTimeoutMs).unref()
  }

  function onSignal() {
    resolveDecision({ aborted: true })
    shutdown()
  }

  process.on('SIGTERM', onSignal)
  process.on('SIGINT', onSignal)

  return {
    port: server.port,
    url: server.url,
    waitForDecision: () => decisionPromise,
    shutdown,
  }
}
