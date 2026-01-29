/**
 * Centralized configuration from environment variables.
 */

const DEFAULT_PORT = 3000

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

export const config = {
  port: getServerPort(),
  browser: process.env.MD_ANNOTATOR_BROWSER || null,
  forceExitTimeoutMs: 5000,
  jsonLimit: '10mb',
}
