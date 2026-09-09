/**
 * Markdown-mode-only configuration. Shared settings (port, host, browser,
 * heartbeat, ...) live in server/core/config.js.
 *
 * PLANTUML_SERVER_URL and KROKI_SERVER_URL are deliberately left unprefixed:
 * they're de-facto conventions shared with other tooling, and prefixing them
 * would break existing setups for no gain.
 */

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
  plantumlServerUrl: getPlantumlServerUrl(),
  krokiServerUrl: getKrokiServerUrl(),
}
