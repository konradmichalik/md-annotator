import { createCanvas } from '@napi-rs/canvas'

/**
 * A small solid-color PNG for tests, generated in-memory so no binary
 * fixture file needs to live in the repo.
 */
export function makeFixturePng(width = 40, height = 30, color = '#336699') {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return canvas.toBuffer('image/png')
}
