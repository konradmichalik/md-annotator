/**
 * Centralized configuration from environment variables.
 */

export const config = {
  port: parseInt(process.env.MD_ANNOTATOR_PORT, 10) || 3000,
  browser: process.env.MD_ANNOTATOR_BROWSER || null,
  forceExitTimeoutMs: 5000,
  jsonLimit: '10mb',
}
