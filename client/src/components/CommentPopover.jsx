import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useFileAutocomplete } from '../hooks/useFileAutocomplete.js'
import { FileAutocomplete } from './FileAutocomplete.jsx'
import { TextareaBackdrop } from './TextareaBackdrop.jsx'

const POPOVER_WIDTH = 384
const GAP = 8

function computePosition(anchorRect) {
  const spaceBelow = window.innerHeight - anchorRect.bottom
  const flipAbove = spaceBelow < 280

  const top = flipAbove
    ? anchorRect.top - GAP
    : anchorRect.bottom + GAP

  let left = anchorRect.left + anchorRect.width / 2 - POPOVER_WIDTH / 2
  left = Math.max(16, Math.min(left, window.innerWidth - POPOVER_WIDTH - 16))

  return { top, left, flipAbove }
}

export function CommentPopover({
  anchorEl,
  initialText = '',
  placeholder = 'Add a comment...',
  onSubmit,
  onClose,
}) {
  const [mode, setMode] = useState('popover')
  const [text, setText] = useState(initialText)
  const [cursorPos, setCursorPos] = useState(initialText.length)
  const [position, setPosition] = useState(null)
  const textareaRef = useRef(null)
  const popoverRef = useRef(null)

  const autocomplete = useFileAutocomplete(text, cursorPos)

  const applyAutocomplete = (index) => {
    autocomplete.applyAccept(index, setText, setCursorPos, textareaRef)
  }

  // Track anchor position (popover mode only)
  useEffect(() => {
    if (mode !== 'popover' || !anchorEl) {return}

    const update = () => {
      setPosition(computePosition(anchorEl.getBoundingClientRect()))
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [anchorEl, mode])

  // Focus textarea on mount and mode changes
  useEffect(() => {
    const id = setTimeout(() => {
      const el = textareaRef.current
      if (el) {
        el.focus()
        el.selectionStart = el.selectionEnd = el.value.length
      }
    }, 0)
    return () => clearTimeout(id)
  }, [mode])

  // Click outside to close (popover mode)
  useEffect(() => {
    if (mode !== 'popover') {return}

    const handleMouseDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [mode, onClose])

  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onSubmit(text)
    }
  }, [text, onSubmit])

  const handleKeyDown = (e) => {
    const action = autocomplete.handleKeyDown(e)
    if (action === 'accept') {
      applyAutocomplete()
      return
    }
    if (action) {return}

    if (e.key === 'Escape') {
      e.preventDefault()
      if (mode === 'dialog') {
        setMode('popover')
      } else {
        onClose()
      }
    }

    if (e.key === 'Enter' && !e.nativeEvent?.isComposing && (e.metaKey || e.ctrlKey) && text.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const textarea = (
    <div className="comment-popover-body">
      <div className="textarea-backdrop-wrap">
        <TextareaBackdrop value={text} textareaRef={textareaRef} />
        <textarea
          ref={textareaRef}
          className={`comment-popover-textarea ${mode === 'dialog' ? 'comment-popover-textarea--expanded' : ''}`}
          placeholder={placeholder}
          value={text}
          aria-expanded={autocomplete.isOpen}
          aria-autocomplete="list"
          onChange={(e) => {
            setText(e.target.value)
            setCursorPos(e.target.selectionStart)
          }}
          onSelect={(e) => setCursorPos(e.target.selectionStart)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {autocomplete.isOpen && (
        <FileAutocomplete
          items={autocomplete.items}
          activeIndex={autocomplete.activeIndex}
          onSelect={applyAutocomplete}
        />
      )}
    </div>
  )

  const footer = (
    <div className="comment-popover-footer">
      <span className="comment-popover-hint">
        {navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter to save
      </span>
      <div className="comment-popover-actions">
        {mode === 'popover' && (
          <button
            type="button"
            className="comment-popover-expand-btn"
            onClick={() => setMode('dialog')}
            title="Expand"
            aria-label="Expand comment editor"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6L13 11M9 21H3m0 0v-6m0 6l8-8" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="comment-popover-cancel-btn"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="comment-popover-submit-btn"
          disabled={!text.trim()}
          onClick={handleSubmit}
        >
          Save
        </button>
      </div>
    </div>
  )

  if (mode === 'dialog') {
    return createPortal(
      <div className="comment-popover-overlay" onMouseDown={onClose}>
        <div
          ref={popoverRef}
          className="comment-popover comment-popover--dialog"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {textarea}
          {footer}
        </div>
      </div>,
      document.body
    )
  }

  if (!position) {return null}

  return createPortal(
    <div
      ref={popoverRef}
      className="comment-popover"
      style={{
        top: position.flipAbove ? undefined : position.top,
        bottom: position.flipAbove ? (window.innerHeight - position.top) : undefined,
        left: position.left,
        width: POPOVER_WIDTH,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {textarea}
      {footer}
    </div>,
    document.body
  )
}
