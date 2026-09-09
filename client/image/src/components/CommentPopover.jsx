import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ANNOTATION_COLORS } from '../utils/annotationColors.js'
import { ARROW_STYLE_ICONS } from '../utils/icons.jsx'

const ARROW_STYLES = [
  { id: 'head', label: 'Arrowhead' },
  { id: 'dimension', label: 'Dimension ticks' }
]

const POPOVER_WIDTH = 280
const POPOVER_HEIGHT_ESTIMATE = 160
const GAP = 12

/**
 * Places the popover below the annotated element by default (so it never
 * covers what it's talking about), flipping above only when there isn't
 * enough room below the anchor point.
 */
function computePosition(anchorPoint) {
  let left = anchorPoint.x - POPOVER_WIDTH / 2
  left = Math.max(16, Math.min(left, window.innerWidth - POPOVER_WIDTH - 16))

  const spaceBelow = window.innerHeight - anchorPoint.y
  const flipAbove = spaceBelow < POPOVER_HEIGHT_ESTIMATE + GAP

  return flipAbove
    ? { bottom: window.innerHeight - anchorPoint.y + GAP, left }
    : { top: anchorPoint.y + GAP, left }
}

/**
 * A small in-page comment box anchored near an annotation (either one just
 * drawn, or an existing one being edited), so the human never leaves the
 * annotator UI to type a comment (no window.prompt) or pick a color.
 */
export default function CommentPopover({
  anchorPoint, initialText = '', initialColor, annotationType, initialArrowStyle, isEditing = false, onSubmit, onClose
}) {
  const [text, setText] = useState(initialText)
  const [color, setColor] = useState(initialColor || ANNOTATION_COLORS[0].hex)
  const [arrowStyle, setArrowStyle] = useState(initialArrowStyle || 'head')
  const textareaRef = useRef(null)
  const position = computePosition(anchorPoint)

  useEffect(() => {
    const id = setTimeout(() => textareaRef.current?.focus(), 0)
    return () => clearTimeout(id)
  }, [])

  const handleSubmit = useCallback(() => {
    onSubmit({ text: text.trim(), color, arrowStyle })
  }, [text, color, arrowStyle, onSubmit])

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return createPortal(
    <div
      className="comment-popover"
      style={{ ...position, width: POPOVER_WIDTH }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="comment-popover-colors" role="radiogroup" aria-label="Annotation color">
        {ANNOTATION_COLORS.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            role="radio"
            aria-checked={color === swatch.hex}
            className={`color-swatch${color === swatch.hex ? ' color-swatch--active' : ''}`}
            style={{ backgroundColor: swatch.hex }}
            title={swatch.id}
            onClick={() => setColor(swatch.hex)}
          />
        ))}
      </div>
      {annotationType === 'arrow' && (
        <div className="arrow-style-toggle" role="radiogroup" aria-label="Arrow end style">
          {ARROW_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={arrowStyle === style.id}
              aria-label={style.label}
              title={style.label}
              className={`arrow-style-swatch${arrowStyle === style.id ? ' arrow-style-swatch--active' : ''}`}
              onClick={() => setArrowStyle(style.id)}
            >
              {ARROW_STYLE_ICONS[style.id]}
            </button>
          ))}
        </div>
      )}
      <div className="comment-popover-body">
        <textarea
          ref={textareaRef}
          className="comment-popover-textarea"
          placeholder="Add a comment (optional)..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="comment-popover-footer">
        <span className="comment-popover-hint">
          {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to save
        </span>
        <div className="comment-popover-actions">
          <button type="button" className="comment-popover-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="comment-popover-submit-btn" onClick={handleSubmit}>
            {isEditing ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
