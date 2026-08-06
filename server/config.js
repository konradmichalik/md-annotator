/**
 * Centralized configuration from environment variables.
 */

const DEFAULT_PORT = 3000
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 30_000

// Guards against a spec like "1-65535" turning startup into a port scan
const MAX_PORT_CANDIDATES = 256

function isValidPort(port) {
  return Number.isInteger(port) && port > 0 && port < 65536
}

/**
 * Parse a port spec: a single port ("3000") or an inclusive range
 * ("19432-19463"). Returns the candidate ports in order, or null when the spec
 * is missing or malformed.
 */
export function parsePortSpec(spec) {
  const trimmed = typeof spec === 'string' ? spec.trim() : ''
  if (!trimmed) { return null }

  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/)
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    if (!isValidPort(start) || !isValidPort(end) || end < start) { return null }
    const count = Math.min(end - start + 1, MAX_PORT_CANDIDATES)
    return Array.from({ length: count }, (_, i) => start + i)
  }

  if (!/^\d+$/.test(trimmed)) { return null }
  const single = parseInt(trimmed, 10)
  return isValidPort(single) ? [single] : null
}

function getServerHost() {
  const envHost = process.env.MD_ANNOTATOR_HOST
  if (envHost && envHost.trim()) {
    return envHost.trim()
  }
  return DEFAULT_HOST
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

const portCandidates = parsePortSpec(process.env.MD_ANNOTATOR_PORT)

export const config = {
  // First candidate; `ports` carries the full range when one was configured
  port: portCandidates?.[0] ?? DEFAULT_PORT,
  ports: portCandidates ?? [DEFAULT_PORT],
  portExplicit: !!portCandidates,
  host: getServerHost(),
  browser: process.env.MD_ANNOTATOR_BROWSER || null,
  heartbeatTimeoutMs: getHeartbeatTimeoutMs(),
  forceExitTimeoutMs: 5000,
  jsonLimit: '10mb',
  plantumlServerUrl: getPlantumlServerUrl(),
  krokiServerUrl: getKrokiServerUrl(),
}
