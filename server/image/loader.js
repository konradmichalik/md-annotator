/**
 * The image-loading and page-capture functions that actually need
 * playwright and @napi-rs/canvas — both optionalDependencies. Kept out of
 * server/image/capture.js (pure detection helpers) so index.js only loads
 * this module once image mode is already confirmed, via a dynamic import.
 */

import { readFile, stat } from 'node:fs/promises'
import { loadImage } from '@napi-rs/canvas'
import { chromium } from 'playwright'
import { isImageFile, isSupportedCaptureUrl } from './capture.js'
import { config } from './config.js'

/**
 * Load and validate a local image file. Rejects unsupported extensions and
 * over-cap byte sizes before a decode is ever attempted, then rejects
 * over-cap pixel dimensions after decoding.
 */
export async function loadImageFromFile(filePath) {
  if (!isImageFile(filePath)) {
    throw new Error(`Unsupported image format: ${filePath}. Supported: .png, .jpg, .jpeg, .webp`)
  }

  const stats = await stat(filePath)
  if (stats.size > config.maxImageBytes) {
    throw new Error(`Image too large: ${filePath} (${stats.size} bytes, max ${config.maxImageBytes})`)
  }

  const buffer = await readFile(filePath)
  const image = await loadImage(buffer)

  if (image.width > config.maxImageDimension || image.height > config.maxImageDimension) {
    throw new Error(
      `Image dimensions too large: ${image.width}x${image.height} (max ${config.maxImageDimension}px per side)`
    )
  }

  return { buffer, width: image.width, height: image.height }
}

/**
 * Capture a full-page screenshot of `url` at the given viewport size.
 * Redirects are followed by the browser itself; each hop is a real
 * navigation the browser re-validates against its own protocol rules, so no
 * separate redirect-chain check is needed here.
 */
export async function captureUrl(url, viewport) {
  if (!isSupportedCaptureUrl(url)) {
    throw new Error(`Unsupported URL: ${url}. Only http:// and https:// are accepted.`)
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport })
    await page.goto(url, { timeout: config.captureTimeoutMs, waitUntil: 'load' })
    const buffer = await page.screenshot({ fullPage: true, type: 'png' })
    const box = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    }))

    if (buffer.length > config.maxImageBytes) {
      throw new Error(`Screenshot too large: ${buffer.length} bytes, max ${config.maxImageBytes}`)
    }
    if (box.width > config.maxImageDimension || box.height > config.maxImageDimension) {
      throw new Error(
        `Screenshot dimensions too large: ${box.width}x${box.height} (max ${config.maxImageDimension}px per side)`
      )
    }

    return { buffer, width: box.width, height: box.height }
  } finally {
    await browser.close()
  }
}
