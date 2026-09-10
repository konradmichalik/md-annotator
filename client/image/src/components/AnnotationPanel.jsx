import { useState, useRef, useEffect } from 'react'
import { TOOL_ICONS, ACTION_ICONS } from '../utils/icons.jsx'

const TYPE_LABELS = { box: 'Box', arrow: 'Arrow', freehand: 'Freehand', highlighter: 'Highlight', pin: 'Pin' }

/** A general comment about the whole image (no geometry, no canvas presence): edited inline right here, not via the canvas popover. */
function GlobalCommentItem({ annotation, isEditing, onStartEdit, onSave, onCancel, onRemove }) {
  const [text, setText] = useState(annotation.text || '')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (isEditing) { textareaRef.current?.focus() }
  }, [isEditing])

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onSave(text)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <li className="panel-item panel-global-comment">
      <div className="panel-item-header">
        <span className="panel-item-title">
          <span className="panel-item-icon">{ACTION_ICONS.addComment}</span>
          General comment
        </span>
        <div className="panel-item-actions">
          {!isEditing && (
            <button
              type="button"
              className="panel-edit-btn"
              onClick={() => { setText(annotation.text || ''); onStartEdit() }}
              title="Edit comment"
              aria-label="Edit comment"
            >
              {ACTION_ICONS.edit}
            </button>
          )}
          <button
            type="button"
            className="panel-delete-btn"
            onClick={() => onRemove(annotation.id)}
            title="Remove comment"
            aria-label="Remove comment"
          >
            &times;
          </button>
        </div>
      </div>
      {isEditing ? (
        <div className="panel-global-edit">
          <textarea
            ref={textareaRef}
            className="panel-global-textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add your comment..."
          />
          <div className="panel-global-edit-actions">
            <button type="button" className="comment-popover-cancel-btn" onClick={onCancel}>Cancel</button>
            <button type="button" className="panel-global-save-btn" onClick={() => onSave(text)}>Save</button>
          </div>
        </div>
      ) : (
        <p className="panel-comment-text">
          {annotation.text || <span className="panel-comment-empty">No comment</span>}
        </p>
      )}
    </li>
  )
}

export default function AnnotationPanel({ annotations, onRemove, onEdit, onEditGlobalComment }) {
  const [editingGlobalId, setEditingGlobalId] = useState(null)

  const globalComments = annotations.filter((a) => a.type === 'comment')
  const shapeAnnotations = annotations.filter((a) => a.type !== 'comment')

  const handleSaveGlobal = (id, text) => {
    onEditGlobalComment(id, text)
    setEditingGlobalId(null)
  }

  if (annotations.length === 0) {
    return <p className="panel-empty">No annotations yet. Pick a tool above and mark up the image.</p>
  }

  return (
    <ul className="panel-list">
      {globalComments.map((annotation) => (
        <GlobalCommentItem
          key={annotation.id}
          annotation={annotation}
          isEditing={editingGlobalId === annotation.id}
          onStartEdit={() => setEditingGlobalId(annotation.id)}
          onSave={(text) => handleSaveGlobal(annotation.id, text)}
          onCancel={() => setEditingGlobalId(null)}
          onRemove={onRemove}
        />
      ))}
      {shapeAnnotations.map((annotation) => {
        // Index into the full (unfiltered) list, not this filtered map's own
        // index - it has to match the canvas's badge numbers, which count
        // over every annotation including general comments.
        const index = annotations.indexOf(annotation)
        return (
          <li key={annotation.id} className="panel-item" onClick={() => onEdit(annotation.id)}>
            <div className="panel-item-header">
              <span className="panel-item-title">
                <span className="panel-item-icon" style={{ color: annotation.color }}>
                  {TOOL_ICONS[annotation.type]}
                </span>
                {index + 1}. {TYPE_LABELS[annotation.type] || annotation.type}
              </span>
              <div className="panel-item-actions">
                <button
                  type="button"
                  className="panel-edit-btn"
                  onClick={(event) => { event.stopPropagation(); onEdit(annotation.id) }}
                  title="Edit annotation"
                  aria-label="Edit annotation"
                >
                  {ACTION_ICONS.edit}
                </button>
                <button
                  type="button"
                  className="panel-delete-btn"
                  onClick={(event) => { event.stopPropagation(); onRemove(annotation.id) }}
                  title="Remove annotation"
                  aria-label="Remove annotation"
                >
                  &times;
                </button>
              </div>
            </div>
            <p className="panel-comment-text">
              {annotation.text || <span className="panel-comment-empty">No comment</span>}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
