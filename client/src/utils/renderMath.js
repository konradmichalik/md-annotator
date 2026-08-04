import katex from 'katex'

/**
 * Render a LaTeX formula to HTML.
 *
 * `output: 'html'` deliberately skips KaTeX's MathML copy: it would duplicate
 * the formula's text content, and every text selection across a formula would
 * pick up both copies. Accessibility is covered by an aria-label carrying the
 * original LaTeX on the wrapper element instead.
 *
 * Returns `{ html }` on success or `{ error }` when the formula does not parse,
 * so callers can fall back to showing the source.
 */
export function renderMath(formula, displayMode = false) {
  try {
    return {
      html: katex.renderToString(formula, {
        displayMode,
        output: 'html',
        throwOnError: true,
        strict: false
      })
    }
  } catch (error) {
    return { error: error.message }
  }
}
