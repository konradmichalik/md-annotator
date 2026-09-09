/**
 * Image-mode-only configuration. Shared settings (port, host, browser,
 * heartbeat, ...) live in server/core/config.js.
 */

import { readEnvWithFallback } from '../core/config.js'

const DEFAULT_CAPTURE_TIMEOUT_MS = 15_000

// width x height, in CSS pixels: matched against page.setViewportSize()
export const VIEWPORT_PRESETS = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
}

/**
 * Resolve a viewport argument: a known preset name (case-insensitive), or an
 * explicit "WxH" size. Returns { width, height }, defaults to desktop when
 * `spec` is null/empty, or null when `spec` matches neither shape.
 */
export function parseViewportSpec(spec) {
  if (!spec) { return VIEWPORT_PRESETS.desktop }
  const trimmed = spec.trim().toLowerCase()
  if (VIEWPORT_PRESETS[trimmed]) { return VIEWPORT_PRESETS[trimmed] }

  const customMatch = trimmed.match(/^(\d+)x(\d+)$/)
  if (customMatch) {
    const width = parseInt(customMatch[1], 10)
    const height = parseInt(customMatch[2], 10)
    if (width > 0 && height > 0) { return { width, height } }
  }

  return null
}

function getCaptureTimeoutMs() {
  const envTimeout = readEnvWithFallback('ANNOTAITR_CAPTURE_TIMEOUT')
  if (envTimeout) {
    const parsed = parseInt(envTimeout, 10)
    if (!isNaN(parsed) && parsed >= 1000 && parsed <= 120_000) {
      return parsed
    }
  }
  return DEFAULT_CAPTURE_TIMEOUT_MS
}

export const config = {
  captureTimeoutMs: getCaptureTimeoutMs(),
  maxImageBytes: 15 * 1024 * 1024,
  maxImageDimension: 20000
}
