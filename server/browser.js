/**
 * Cross-platform browser opening utility.
 */

import open from 'open'
import { config } from './config.js'

/**
 * Open URL in the user's default browser.
 * Optionally uses MD_ANNOTATOR_BROWSER environment variable.
 */
export async function openBrowser(url) {
  const options = config.browser ? { app: { name: config.browser } } : {}

  try {
    await open(url, options)
  } catch {
    // Silent failure — browser opening is best-effort
  }
}
