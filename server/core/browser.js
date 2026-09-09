/**
 * Cross-platform browser opening utility, shared by both annotator modes.
 */

import open from 'open'
import { config, readEnvWithFallback } from './config.js'

/**
 * Open URL in the user's default browser. Best-effort: a failure here should
 * never block the CLI, since the user can still open the URL manually from
 * the printed stderr line. Set ANNOTAITR_NO_OPEN to skip this entirely (used
 * by `dev:client` against a separately-running server). Read live rather than
 * from the cached `config` object, so a test (or a wrapper script) can flip
 * it at runtime instead of only at process start.
 */
export async function openBrowser(url) {
  if (readEnvWithFallback('ANNOTAITR_NO_OPEN')) { return }
  const options = config.browser ? { app: { name: config.browser } } : {}
  try {
    await open(url, options)
  } catch {
    // Silent failure — browser opening is best-effort
  }
}
