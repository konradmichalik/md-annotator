import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useFileAutocomplete } from '../hooks/useFileAutocomplete.js'
import { FileAutocomplete } from './FileAutocomplete.jsx'
import { TextareaBackdrop } from './TextareaBackdrop.jsx'

export function Toolbar({ highlightElement, onAnnotate, onClose, onDelete, requestedStep: requestedStepProp, editAnnotation, elementMode, insertionMode }) {
  const [step, setStep] = useState('menu')
  const [inputValue, setInputValue] = useState('')
  const [position, setPosition] = useState(null)
  const [cursorPos, setCursorPos] = useState(0)
  const inputRef = useRef(null)

  const autocomplete = useFileAutocomplete(inputValue, cursorPos)

  const applyAutocomplete = (index) => {
    const result = autocomplete.accept(index)
    if (result) {
      setInputValue(result.newValue)
      setCursorPos(result.newCursorPos)
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = result.newCursorPos
          inputRef.current.selectionEnd = result.newCursorPos
          inputRef.current.focus()
        }
      })
    }
  }

  useEffect(() => {
    if (step === 'input') {inputRef.current?.focus()}
  }, [step])

  // NOTES annotations are read-only — close toolbar immediately
  useEffect(() => {
    if (editAnnotation?.type === 'NOTES') {
      onClose()
    }
  }, [editAnnotation, onClose])

  useEffect(() => {
    if (editAnnotation) {
      const next = editAnnotation.text || ''
      setStep('menu')
      setInputValue(next)
      setCursorPos(next.length)
    } else if (insertionMode) {
      setStep('menu')
      setInputValue('')
      setCursorPos(0)
    } else if (requestedStepProp) {
      setStep('input')
      setInputValue('')
      setCursorPos(0)
    } else {
      setStep('menu')
      setInputValue('')
      setCursorPos(0)
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
      setInputValue(e.key)
      setCursorPos(e.key.length)
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
      onAnnotate(insertionMode ? 'INSERTION' : 'COMMENT', inputValue)
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
        <form onSubmit={handleSubmit} className="toolbar-input" style={{ position: 'relative' }}>
          <div className="textarea-backdrop-wrap">
            <TextareaBackdrop value={inputValue} textareaRef={inputRef} />
            <textarea
              ref={inputRef}
              rows={1}
              className="toolbar-textarea"
            placeholder={insertionMode ? "Text to insert..." : "Add a comment..."}
            value={inputValue}
            aria-expanded={autocomplete.isOpen}
            aria-autocomplete="list"
            onChange={(e) => {
              setInputValue(e.target.value)
              setCursorPos(e.target.selectionStart)
            }}
            onSelect={(e) => setCursorPos(e.target.selectionStart)}
            onKeyDown={(e) => {
              const action = autocomplete.handleKeyDown(e)
              if (action === 'accept') {
                applyAutocomplete()
                return
              }
              if (action) { return }

              if (e.key === 'Escape') {
                editAnnotation ? onClose() : setStep('menu')
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && inputValue.trim()) {
                e.preventDefault()
                onAnnotate(insertionMode ? 'INSERTION' : 'COMMENT', inputValue)
              }
            }}
          />
          </div>
          {autocomplete.isOpen && (
            <FileAutocomplete
              items={autocomplete.items}
              activeIndex={autocomplete.activeIndex}
              onSelect={applyAutocomplete}
            />
          )}
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
