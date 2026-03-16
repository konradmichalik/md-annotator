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

function getPlantumlServerUrl() {
  const envUrl = process.env.PLANTUML_SERVER_URL
  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }
  return 'https://www.plantuml.com/plantuml'
}

function getKrokiServerUrl() {
  const envUrl = process.env.KROKI_SERVER_URL
  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }
  return 'https://kroki.io'
}

export const config = {
  port: getServerPort(),
  portExplicit: !!process.env.MD_ANNOTATOR_PORT,
  browser: process.env.MD_ANNOTATOR_BROWSER || null,
  heartbeatTimeoutMs: getHeartbeatTimeoutMs(),
  forceExitTimeoutMs: 5000,
  jsonLimit: '10mb',
  plantumlServerUrl: getPlantumlServerUrl(),
  krokiServerUrl: getKrokiServerUrl(),
}
