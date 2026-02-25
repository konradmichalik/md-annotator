import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export function Toolbar({ highlightElement, onAnnotate, onClose, onDelete, requestedStep: requestedStepProp, editAnnotation, elementMode }) {
  const [step, setStep] = useState('menu')
  const [inputValue, setInputValue] = useState('')
  const [position, setPosition] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (step === 'input') {inputRef.current?.focus()}
  }, [step])

  useEffect(() => {
    if (editAnnotation) {
      setStep('menu')
      setInputValue(editAnnotation.text || '')
    } else if (requestedStepProp) {
      setStep('input')
      setInputValue('')
    } else {
      setStep('menu')
      setInputValue('')
    }
  }, [highlightElement, requestedStepProp, editAnnotation, elementMode])

  useEffect(() => {
    if (!highlightElement) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const rect = highlightElement.getBoundingClientRect()
      const toolbarTop = rect.top - 48

      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        onClose()
        return
      }

      setPosition({
        top: toolbarTop,
        left: rect.left + rect.width / 2
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onAnnotate('COMMENT', inputValue)
    }
  }

  return createPortal(
    <div
      className="annotation-toolbar"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {step === 'menu' ? (
        <div className="toolbar-menu">
          {editAnnotation ? (
            <>
              <button
                onClick={handleDelete}
                className="toolbar-btn toolbar-btn-delete"
                title="Remove annotation"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="toolbar-label">Remove</span>
              </button>
              <button
                onClick={() => setStep('input')}
                className="toolbar-btn toolbar-btn-comment"
                title="Edit comment (Cmd+K)"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
                <span className="toolbar-label">{editAnnotation.type === 'COMMENT' ? 'Edit' : 'Comment'}</span>
              </button>
              <span className="toolbar-divider" />
              <button
                onClick={onClose}
                className="toolbar-btn toolbar-btn-cancel"
                title="Close"
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
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="toolbar-input">
          <textarea
            ref={inputRef}
            rows={1}
            className="toolbar-textarea"
            placeholder="Add a comment..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                editAnnotation ? onClose() : setStep('menu')
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && inputValue.trim()) {
                e.preventDefault()
                onAnnotate('COMMENT', inputValue)
              }
            }}
          />
          <button type="submit" disabled={!inputValue.trim()} className="toolbar-submit">
            Save
          </button>
          <button type="button" onClick={() => editAnnotation ? onClose() : setStep('menu')} className="toolbar-btn toolbar-btn-cancel">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      )}
    </div>,
    document.body
  )
}
