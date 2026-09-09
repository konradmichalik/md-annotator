import { createCanvas, loadImage } from '@napi-rs/canvas'

const STROKE_WIDTH = 4
const PIN_RADIUS = 14
const BADGE_RADIUS = 11
const DEFAULT_COLOR = '#e11d48'

const LEGEND_PADDING = 14
const LEGEND_LINE_HEIGHT = 18
const LEGEND_GAP = 8
const LEGEND_FONT_SIZE = 13
const LEGEND_BG = '#20242c'
const LEGEND_HEADER_COLOR = '#f5f6fa'
const LEGEND_TEXT_COLOR = '#b8bfcc'

const TYPE_LABELS = { box: 'Box', arrow: 'Arrow', freehand: 'Freehand', pin: 'Pin' }

function drawArrowhead(ctx, x1, y1, x2, y2, color) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLength = 16
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6)
  )
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6)
  )
  ctx.strokeStyle = color
  ctx.lineWidth = STROKE_WIDTH
  ctx.stroke()
}

function drawBadge(ctx, x, y, index, color) {
  ctx.beginPath()
  ctx.arc(x, y, BADGE_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(index + 1), x, y)
}

function drawAnnotation(ctx, annotation, index) {
  const color = annotation.color || DEFAULT_COLOR
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = STROKE_WIDTH

  if (annotation.type === 'box') {
    const { x, y, width, height } = annotation.geometry
    ctx.strokeRect(x, y, width, height)
    drawBadge(ctx, x, y, index, color)
  } else if (annotation.type === 'arrow') {
    const { x1, y1, x2, y2 } = annotation.geometry
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    drawArrowhead(ctx, x1, y1, x2, y2, color)
    drawBadge(ctx, x1, y1, index, color)
  } else if (annotation.type === 'freehand') {
    const points = annotation.geometry.points
    if (points.length < 2) { return }
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
      ctx.lineTo(point.x, point.y)
    }
    ctx.stroke()
    drawBadge(ctx, points[0].x, points[0].y, index, color)
  } else if (annotation.type === 'pin') {
    const { x, y } = annotation.geometry
    ctx.beginPath()
    ctx.arc(x, y, PIN_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(index + 1), x, y)
  }
}

/** Greedy word-wrap of `text` to fit within `maxWidth`, using `ctx`'s current font. */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) { return [''] }
  const lines = []
  let current = words[0]
  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`
    if (ctx.measureText(candidate).width > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  lines.push(current)
  return lines
}

function buildLegendEntries(ctx, annotations, maxWidth) {
  ctx.font = `${LEGEND_FONT_SIZE}px sans-serif`
  return annotations.map((annotation, index) => ({
    index,
    type: annotation.type,
    color: annotation.color || DEFAULT_COLOR,
    lines: wrapText(ctx, annotation.text?.trim() || '(no comment)', maxWidth)
  }))
}

/**
 * Render `annotations` onto a copy of the source image (shapes plus a small
 * numbered badge per shape), and append a text legend below the image
 * listing each annotation's comment. The legend keeps the comments attached
 * to the same file as the markup instead of only existing in the separate
 * feedback text — a viewer of just this image still sees what was said.
 */
export async function flattenAnnotations(imageBuffer, annotations) {
  const image = await loadImage(imageBuffer)

  // A throwaway context to measure legend text before the final canvas
  // (whose height depends on the legend) can be created.
  const measureCtx = createCanvas(1, 1).getContext('2d')
  const legendMaxWidth = image.width - LEGEND_PADDING * 2 - 22
  const entries = annotations.length > 0 ? buildLegendEntries(measureCtx, annotations, legendMaxWidth) : []

  const totalLines = entries.reduce((sum, entry) => sum + 1 + entry.lines.length, 0)
  const legendHeight = entries.length === 0
    ? 0
    : LEGEND_PADDING * 2 + totalLines * LEGEND_LINE_HEIGHT + (entries.length - 1) * LEGEND_GAP

  const canvas = createCanvas(image.width, image.height + legendHeight)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(image, 0, 0)
  annotations.forEach((annotation, index) => drawAnnotation(ctx, annotation, index))

  if (legendHeight > 0) {
    ctx.fillStyle = LEGEND_BG
    ctx.fillRect(0, image.height, image.width, legendHeight)
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    let y = image.height + LEGEND_PADDING
    entries.forEach((entry, i) => {
      ctx.beginPath()
      ctx.arc(LEGEND_PADDING + 5, y + LEGEND_LINE_HEIGHT / 2, 5, 0, Math.PI * 2)
      ctx.fillStyle = entry.color
      ctx.fill()

      ctx.font = `bold ${LEGEND_FONT_SIZE}px sans-serif`
      ctx.fillStyle = LEGEND_HEADER_COLOR
      ctx.fillText(`${entry.index + 1}. ${TYPE_LABELS[entry.type] || entry.type}`, LEGEND_PADDING + 18, y)
      y += LEGEND_LINE_HEIGHT

      ctx.font = `${LEGEND_FONT_SIZE}px sans-serif`
      ctx.fillStyle = LEGEND_TEXT_COLOR
      for (const line of entry.lines) {
        ctx.fillText(line, LEGEND_PADDING + 18, y)
        y += LEGEND_LINE_HEIGHT
      }

      if (i < entries.length - 1) { y += LEGEND_GAP }
    })
  }

  return canvas.toBuffer('image/png')
}
