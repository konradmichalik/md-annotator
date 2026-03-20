import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getQuickLabels, getLabelColors } from '../utils/quickLabels.js'
import { LabelIcon } from './LabelIcon.jsx'

const GAP = 8

function computePosition(anchorRect) {
  const spaceBelow = window.innerHeight - anchorRect.bottom
  const flipAbove = spaceBelow < 320

  const top = flipAbove
    ? anchorRect.top - GAP
    : anchorRect.bottom + GAP

  let left = anchorRect.left + anchorRect.width / 2 - 140
  left = Math.max(16, Math.min(left, window.innerWidth - 296))

  return { top, left, flipAbove }
}

export function QuickLabelPicker({ anchorEl, onSelect, onClose }) {
  const pickerRef = useRef(null)
  const labels = getQuickLabels()

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose()
      }
    }
    // Defer to avoid immediately closing on the click that opens it
    const id = setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown)
    }, 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }

      const isDigit = e.code >= 'Digit1' && e.code <= 'Digit9' || e.code === 'Digit0'
      if (isDigit && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        const index = e.code === 'Digit0' ? 9 : parseInt(e.code.replace('Digit', ''), 10) - 1
        if (index < labels.length) {
          onSelect(labels[index])
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [labels, onSelect, onClose])

  if (!anchorEl) { return null }

  const rect = anchorEl.getBoundingClientRect()
  const pos = computePosition(rect)

  return createPortal(
    <div
      ref={pickerRef}
      className="quick-label-picker"
      style={{
        top: pos.flipAbove ? undefined : pos.top,
        bottom: pos.flipAbove ? (window.innerHeight - pos.top) : undefined,
        left: pos.left,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="quick-label-picker-header">Quick Label</div>
      <ul className="quick-label-list" role="listbox">
        {labels.map((label, i) => {
          const colors = getLabelColors(label.color)
          const shortcut = i < 10 ? String(i === 9 ? 0 : i + 1) : null
          return (
            <li
              key={label.id}
              role="option"
              className="quick-label-item"
              onClick={() => onSelect(label)}
              style={{ animationDelay: `${i * 18}ms` }}
            >
              <span
                className="quick-label-accent"
                style={{ backgroundColor: colors.text }}
              />
              <span className="quick-label-icon" style={{ color: colors.text }}>
                <LabelIcon labelId={label.id} />
              </span>
              <span className="quick-label-text">{label.text}</span>
              {shortcut && (
                <kbd className="quick-label-key">
                  Alt+{shortcut}
                </kbd>
              )}
            </li>
          )
        })}
      </ul>
    </div>,
    document.body
  )
}
