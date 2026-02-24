const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

export function AnnotationPanel({
  annotations,
  selectedAnnotationId,
  onSelect,
  onEdit,
  onDelete,
  onExport,
  collapsed
}) {
  // Collapsed view
  if (collapsed) {
    return null
  }

  // Empty state
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

  // Expanded view with annotations
  return (
    <aside className="annotation-panel">
      <div className="panel-header">
        <h2>Annotations</h2>
        <span className="panel-badge">{annotations.length}</span>
        <button
          className="panel-icon-btn"
          onClick={onExport}
          title="Export annotations"
        >
          <ExportIcon />
        </button>
      </div>
      <ul className="panel-list">
        {annotations.map(ann => (
          <li
            key={ann.id}
            className={`panel-item${ann.id === selectedAnnotationId ? ' selected' : ''} panel-item-${ann.type.toLowerCase()}`}
            onClick={() => {
              onSelect(ann.id)
              const el = document.querySelector(`[data-highlight-id="${ann.id}"]`)
              if (el) {el.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            }}
          >
            <div className="panel-item-header">
              <span className={`panel-type-badge ${ann.type.toLowerCase()}`}>
                {ann.type === 'DELETION' ? 'Delete' : 'Comment'}
              </span>
              <div className="panel-item-actions">
                <button
                  className="panel-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(ann.id)
                  }}
                  title="Edit annotation"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                </button>
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
