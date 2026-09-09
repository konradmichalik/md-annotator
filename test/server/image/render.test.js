import { describe, it, expect } from 'vitest'
import { loadImage } from '@napi-rs/canvas'
import { flattenAnnotations } from '../../../server/image/render.js'
import { makeFixturePng } from '../../helpers/fixtureImage.js'

describe('flattenAnnotations', () => {
  it('returns a PNG of the same dimensions when there are no annotations', async () => {
    const source = makeFixturePng(40, 30)
    const result = await flattenAnnotations(source, [])
    const decoded = await loadImage(result)
    expect(decoded.width).toBe(40)
    expect(decoded.height).toBe(30)
  })

  it('changes the pixel bytes when a box annotation is drawn', async () => {
    const source = makeFixturePng(40, 30, '#000000')
    const box = { type: 'box', color: '#ff0000', geometry: { x: 5, y: 5, width: 20, height: 15 } }
    const result = await flattenAnnotations(source, [box])
    expect(Buffer.compare(result, source)).not.toBe(0)
  })

  it('handles an arrow annotation without throwing', async () => {
    const source = makeFixturePng(40, 30)
    const arrow = { type: 'arrow', color: '#ff0000', geometry: { x1: 0, y1: 0, x2: 39, y2: 29 } }
    await expect(flattenAnnotations(source, [arrow])).resolves.toBeInstanceOf(Buffer)
  })

  it('handles a freehand annotation without throwing', async () => {
    const source = makeFixturePng(40, 30)
    const freehand = {
      type: 'freehand',
      color: '#ff0000',
      geometry: { points: [{ x: 2, y: 2 }, { x: 10, y: 8 }, { x: 20, y: 4 }] }
    }
    await expect(flattenAnnotations(source, [freehand])).resolves.toBeInstanceOf(Buffer)
  })

  it('handles a pin annotation and numbers it', async () => {
    const source = makeFixturePng(40, 30)
    const pin = { type: 'pin', color: '#ff0000', text: 'note', geometry: { x: 20, y: 15 } }
    await expect(flattenAnnotations(source, [pin])).resolves.toBeInstanceOf(Buffer)
  })

  it('ignores a degenerate freehand mark with fewer than 2 points', async () => {
    const source = makeFixturePng(40, 30)
    const freehand = { type: 'freehand', geometry: { points: [{ x: 2, y: 2 }] } }
    await expect(flattenAnnotations(source, [freehand])).resolves.toBeInstanceOf(Buffer)
  })

  it('appends a legend below the image listing each annotation\'s comment', async () => {
    const source = makeFixturePng(200, 100)
    const box = { type: 'box', color: '#ff0000', text: 'Move this up', geometry: { x: 5, y: 5, width: 20, height: 15 } }
    const pin = { type: 'pin', color: '#00ff00', text: '', geometry: { x: 50, y: 50 } }
    const result = await flattenAnnotations(source, [box, pin])
    const decoded = await loadImage(result)
    expect(decoded.width).toBe(200)
    expect(decoded.height).toBeGreaterThan(100)
  })

  it('does not add a legend when there are no annotations', async () => {
    const source = makeFixturePng(200, 100)
    const result = await flattenAnnotations(source, [])
    const decoded = await loadImage(result)
    expect(decoded.height).toBe(100)
  })
})
