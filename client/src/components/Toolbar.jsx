import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CommentPopover } from './CommentPopover.jsx'

export function Toolbar({ highlightElement, onAnnotate, onClose, onDelete, requestedStep: requestedStepProp, editAnnotation, elementMode, insertionMode }) {
  const [step, setStep] = useState('menu')
  const [initialText, setInitialText] = useState('')
  const [position, setPosition] = useState(null)

  // NOTES annotations are read-only — close toolbar immediately
  useEffect(() => {
    if (editAnnotation?.type === 'NOTES') {
      onClose()
    }
  }, [editAnnotation, onClose])

  useEffect(() => {
    if (editAnnotation) {
      setStep('menu')
      setInitialText(editAnnotation.text || '')
    } else if (insertionMode) {
      setStep('menu')
      setInitialText('')
    } else if (requestedStepProp) {
      setStep('input')
      setInitialText('')
    } else {
      setStep('menu')
      setInitialText('')
    }
  }, [highlightElement, requestedStepProp, editAnnotation, elementMode, insertionMode])

  // Type-to-comment: any printable key in menu state transitions to input
  useEffect(() => {
    if (step !== 'menu' || !highlightElement || editAnnotation) {return}
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'textarea' || tag === 'input') {return}
      if (e.metaKey || e.ctrlKey || e.altKey) {return}
      if (e.key.length !== 1) {return}
      e.preventDefault()
      setInitialText(e.key)
      setStep('input')
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [step, highlightElement, editAnnotation])

  useEffect(() => {
    if (!highlightElement) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const rect = highlightElement.getBoundingClientRect()
      const toolbarTop = Math.max(4, rect.top - 48)

      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        onClose()
        return
      }

      setPosition({
        top: toolbarTop,
        left: Math.max(80, Math.min(rect.left + rect.width / 2, window.innerWidth - 80))
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [highlightElement, onClose, step])

  if (!highlightElement || !position) {return null}

  const handleTypeSelect = (type) => {
    if (type === 'DELETION') {
      onAnnotate(type)
    } else {
      setStep('input')
    }
  }

  const handleDelete = () => {
    if (editAnnotation && onDelete) {
      onDelete(editAnnotation.id)
    }
  }

  const handlePopoverSubmit = (text) => {
    const type = insertionMode || editAnnotation?.type === 'INSERTION' ? 'INSERTION' : 'COMMENT'
    onAnnotate(type, text)
  }

  const handlePopoverClose = () => {
    if (editAnnotation) {
      onClose()
    } else {
      setStep('menu')
    }
  }

  return (
    <>
      {step === 'menu' && createPortal(
        <div
          className="annotation-toolbar"
          style={{ top: position.top, left: position.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="toolbar-menu">
            {editAnnotation ? (
                <>
                  <button
                    onClick={handleDelete}
                    className="toolbar-btn toolbar-btn-edit-remove"
                    title="Remove annotation"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="toolbar-label">Remove</span>
                  </button>
                  <button
                    onClick={() => setStep('input')}
                    className="toolbar-btn toolbar-btn-edit-action"
                    title="Edit comment (Cmd+K)"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                    <span className="toolbar-label">{editAnnotation.type === 'COMMENT' || editAnnotation.type === 'INSERTION' ? 'Edit' : 'Comment'}</span>
                  </button>
                  <span className="toolbar-divider" />
                  <button
                    onClick={onClose}
                    className="toolbar-btn toolbar-btn-cancel"
                    title="Close"
                    aria-label="Close"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : insertionMode ? (
                <>
                  <button
                    onClick={() => setStep('input')}
                    className="toolbar-btn toolbar-btn-insert"
                    title="Insert text here"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
                    </svg>
                    <span className="toolbar-label">Insert</span>
                  </button>
                  <span className="toolbar-divider" />
                  <button
                    onClick={onClose}
                    className="toolbar-btn toolbar-btn-cancel"
                    title="Cancel"
                    aria-label="Cancel"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleTypeSelect('DELETION')}
                    className="toolbar-btn toolbar-btn-delete"
                    title="Delete (Cmd+D)"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="toolbar-label">Delete</span>
                  </button>
                  <button
                    onClick={() => handleTypeSelect('COMMENT')}
                    className="toolbar-btn toolbar-btn-comment"
                    title="Comment (Cmd+K)"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <span className="toolbar-label">Comment</span>
                  </button>
                  <span className="toolbar-divider" />
                  <button
                    onClick={onClose}
                    className="toolbar-btn toolbar-btn-cancel"
                    title="Cancel"
                    aria-label="Cancel"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
          </div>
        </div>,
        document.body
      )}

      {step === 'input' && (
        <CommentPopover
          anchorEl={highlightElement}
          initialText={initialText}
          placeholder={insertionMode ? 'Text to insert...' : 'Add a comment...'}
          onSubmit={handlePopoverSubmit}
          onClose={handlePopoverClose}
        />
      )}
    </>
  )
}
