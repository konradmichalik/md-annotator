/**
 * LaTeX math delimiter detection.
 *
 * Deliberately conservative: the same renderer sees arbitrary prose, so an
 * amount like `$5-$10` or a stray `$$` must stay literal text rather than
 * swallowing the rest of the document.
 */

// Content that is only digits and number punctuation is an amount, not a formula
const NUMERIC_ONLY = /^[\d\s.,]+$/

// A digit adjacent to a delimiter means we are looking at an amount, not math
function isAmountBoundary(char) {
  return /\d/.test(char ?? '')
}

function cleanFormula(raw) {
  const formula = raw.trim()
  if (!formula || NUMERIC_ONLY.test(formula)) { return null }
  return formula
}

// Display delimiters, whether they open a block or sit inside a paragraph
const DISPLAY_DELIMITERS = [
  { open: '$$', close: '$$' },
  { open: '\\[', close: '\\]' }
]

function matchSpan(text, open, close, display) {
  if (!text.startsWith(open)) { return null }
  const end = text.indexOf(close, open.length)
  if (end === -1) { return null }
  const inner = text.slice(open.length, end)
  if (inner.includes('\n')) { return null }
  const formula = cleanFormula(inner)
  if (!formula) { return null }
  return { raw: text.slice(0, end + close.length), formula, display }
}

/**
 * Match math at position 0 of `text`.
 * Returns `{ raw, formula, display }` or null.
 */
export function matchInlineMath(text) {
  for (const { open, close } of DISPLAY_DELIMITERS) {
    if (text.startsWith(open)) {
      // "$$100k" is an amount, not an equation
      if (isAmountBoundary(text[open.length])) { return null }
      return matchSpan(text, open, close, true)
    }
  }

  if (text.startsWith('\\(')) {
    return matchSpan(text, '\\(', '\\)', false)
  }

  if (!text.startsWith('$')) { return null }

  // No space directly inside the delimiters — keeps "$ 100 $" out
  if (/\s/.test(text[1] ?? '')) { return null }

  const close = text.indexOf('$', 1)
  if (close === -1) { return null }

  const inner = text.slice(1, close)
  if (inner.includes('\n') || /\s$/.test(inner)) { return null }

  // "$5-$10": a digit right after the closing delimiter means these are amounts
  if (isAmountBoundary(text[close + 1])) { return null }

  const formula = cleanFormula(inner)
  if (!formula) { return null }

  return { raw: text.slice(0, close + 1), formula, display: false }
}

/**
 * Detect a display-math block starting at `lines[startIndex]`.
 * Returns `{ formula, endIndex }` (inclusive) or null when the line does not
 * open display math or the block is never closed.
 */
export function findDisplayMath(lines, startIndex) {
  const first = (lines[startIndex] ?? '').trim()

  const delimiter = DISPLAY_DELIMITERS.find(d => first.startsWith(d.open))
  if (!delimiter) { return null }

  const afterOpen = first.slice(delimiter.open.length)

  // "$$100k" is an amount, not an equation
  if (isAmountBoundary(afterOpen[0])) { return null }

  // Single-line form: $$ … $$
  if (afterOpen.endsWith(delimiter.close) && afterOpen.length > delimiter.close.length) {
    const formula = cleanFormula(afterOpen.slice(0, -delimiter.close.length))
    return formula ? { formula, endIndex: startIndex } : null
  }

  // Fenced form: scan for the closing delimiter
  const body = afterOpen ? [afterOpen] : []
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].trim().endsWith(delimiter.close)) {
      body.push(lines[i].slice(0, lines[i].lastIndexOf(delimiter.close)))
      const formula = cleanFormula(body.join('\n'))
      return formula ? { formula, endIndex: i } : null
    }
    body.push(lines[i])
  }

  // Never closed — caller falls back to treating the line as ordinary text
  return null
}
