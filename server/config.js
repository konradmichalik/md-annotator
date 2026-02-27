/**
 * Centralized configuration from environment variables.
 */

const DEFAULT_PORT = 3000
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 30_000

function getServerPort() {
  const envPort = process.env.MD_ANNOTATOR_PORT
  if (envPort) {
    const parsed = parseInt(envPort, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
      return parsed
    }
  }
  return DEFAULT_PORT
}

function getHeartbeatTimeoutMs() {
  const envTimeout = process.env.MD_ANNOTATOR_TIMEOUT
  if (envTimeout) {
    const parsed = parseInt(envTimeout, 10)
    if (!isNaN(parsed) && parsed >= 5000 && parsed <= 300_000) {
      return parsed
    }
  }
  return DEFAULT_HEARTBEAT_TIMEOUT_MS
}

export const config = {
  port: getServerPort(),
  browser: process.env.MD_ANNOTATOR_BROWSER || null,
  heartbeatTimeoutMs: getHeartbeatTimeoutMs(),
  forceExitTimeoutMs: 5000,
  jsonLimit: '10mb',
}
