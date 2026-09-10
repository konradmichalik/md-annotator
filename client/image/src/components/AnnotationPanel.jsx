import { TOOL_ICONS } from '../utils/icons.jsx'

const TYPE_LABELS = { box: 'Box', arrow: 'Arrow', freehand: 'Freehand', highlighter: 'Highlight', pin: 'Pin' }

export default function AnnotationPanel({ annotations, onRemove, onEdit }) {
  if (annotations.length === 0) {
    return <p className="panel-empty">No annotations yet. Pick a tool above and mark up the image.</p>
  }

  return (
    <ul className="panel-list">
      {annotations.map((annotation, index) => (
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
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
      ))}
    </ul>
  )
}
