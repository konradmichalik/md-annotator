export function AnnotationPanel({ annotations, selectedAnnotationId, onSelect, onDelete }) {
  if (annotations.length === 0) {
    return (
      <aside className="annotation-panel">
        <div className="panel-header">
          <h2>Annotations</h2>
          <span className="panel-badge">0</span>
        </div>
        <p className="panel-empty">Select text in the document to add annotations.</p>
      </aside>
    )
  }

  return (
    <aside className="annotation-panel">
      <div className="panel-header">
        <h2>Annotations</h2>
        <span className="panel-badge">{annotations.length}</span>
      </div>
      <ul className="panel-list">
        {annotations.map(ann => (
          <li
            key={ann.id}
            className={`panel-item${ann.id === selectedAnnotationId ? ' selected' : ''} panel-item-${ann.type.toLowerCase()}`}
            onClick={() => {
              onSelect(ann.id)
              const el = document.querySelector(`[data-bindid="${ann.id}"], mark.annotation-highlight`)
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          >
            <div className="panel-item-header">
              <span className={`panel-type-badge ${ann.type.toLowerCase()}`}>
                {ann.type === 'DELETION' ? 'Delete' : 'Comment'}
              </span>
              <button
                className="panel-delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(ann.id)
                }}
                title="Remove annotation"
              >
                ×
              </button>
            </div>
            <p className="panel-original-text">"{ann.originalText.length > 80
              ? ann.originalText.slice(0, 80) + '...'
              : ann.originalText}"</p>
            {ann.text && <p className="panel-comment-text">{ann.text}</p>}
          </li>
        ))}
      </ul>
    </aside>
  )
}
