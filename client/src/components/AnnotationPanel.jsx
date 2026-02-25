import { useRef, useState, useEffect } from 'react'

const MoreIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
)

const MAX_IMPORT_SIZE = 5 * 1024 * 1024 // 5 MB

export function AnnotationPanel({
  annotations,
  selectedAnnotationId,
  onSelect,
  onEdit,
  onDelete,
  onExport,
  onImport,
  collapsed,
  width
}) {
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleImportClick = () => {
    setMenuOpen(false)
    fileInputRef.current?.click()
  }

  const handleExportClick = () => {
    setMenuOpen(false)
    onExport()
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) {return}
    if (file.size > MAX_IMPORT_SIZE) {
      alert('File too large. Maximum import size is 5 MB.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        onImport(data)
      } catch {
        alert('Invalid JSON file')
      }
      e.target.value = ''
    }
    reader.onerror = () => {
      alert('Failed to read file')
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    if (!menuOpen) {return}
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  if (collapsed) {
    return null
  }

  const hasAnnotations = annotations.length > 0

  const moreMenu = (
    <div className="panel-menu" ref={menuRef}>
      <button className="panel-icon-btn" onClick={() => setMenuOpen(prev => !prev)} title="More actions">
        <MoreIcon />
      </button>
      {menuOpen && (
        <div className="panel-menu-dropdown">
          {hasAnnotations && (
            <button className="panel-menu-item" onClick={handleExportClick}>
              Export
            </button>
          )}
          <button className="panel-menu-item" onClick={handleImportClick}>
            Import
          </button>
        </div>
      )}
    </div>
  )

  if (!hasAnnotations) {
    return (
      <aside className="annotation-panel" style={width ? { width: `${width}px` } : undefined}>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileSelect} />
        <div className="panel-header">
          <h2>Annotations</h2>
          <span className="panel-badge">0</span>
          {moreMenu}
        </div>
        <p className="panel-empty">Select text, click an image, or click a diagram to add annotations.</p>
      </aside>
    )
  }

  return (
    <aside className="annotation-panel" style={width ? { width: `${width}px` } : undefined}>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileSelect} />
      <div className="panel-header">
        <h2>Annotations</h2>
        <span className="panel-badge">{annotations.length}</span>
        {moreMenu}
      </div>
      <ul className="panel-list">
        {annotations.map(ann => {
          const isElement = ann.targetType === 'image' || ann.targetType === 'diagram'
          const badgeLabel = ann.type === 'DELETION' ? 'Delete' : 'Comment'
          const badgeClass = ann.type.toLowerCase()

          return (
          <li
            key={ann.id}
            className={`panel-item${ann.id === selectedAnnotationId ? ' selected' : ''} panel-item-${ann.type.toLowerCase()}`}
            onClick={() => {
              onSelect(ann.id)
              if (isElement) {
                let targetEl = null
                if (ann.targetType === 'image') {
                  targetEl = document.querySelector(`[data-block-id="${ann.blockId}"] .annotatable-image-wrapper[data-image-src="${CSS.escape(ann.imageSrc)}"]`)
                } else if (ann.targetType === 'diagram') {
                  targetEl = document.querySelector(`[data-block-id="${ann.blockId}"] .mermaid-diagram`)
                    || document.querySelector(`[data-block-id="${ann.blockId}"]`)
                }
                if (targetEl) {targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              } else {
                const el = document.querySelector(`[data-highlight-id="${ann.id}"]`)
                if (el) {el.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              }
            }}
          >
            <div className="panel-item-header">
              <span className={`panel-type-badge ${badgeClass}`}>
                {badgeLabel}
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
            {ann.targetType === 'image' ? (
              <p className="panel-original-text">
                <span className="panel-element-icon">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </span>
                {ann.imageAlt || ann.imageSrc}
              </p>
            ) : ann.targetType === 'diagram' ? (
              <p className="panel-original-text">
                <span className="panel-element-icon">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1zM7 10v4m0 0l5 3m-5-3l5-3"/>
                  </svg>
                </span>
                {ann.originalText.split('\n')[0]}
              </p>
            ) : (
              <p className="panel-original-text">"{ann.originalText.length > 80
                ? ann.originalText.slice(0, 80) + '...'
                : ann.originalText}"</p>
            )}
            {ann.text && <p className="panel-comment-text">{ann.text}</p>}
          </li>
          )
        })}
      </ul>
    </aside>
  )
}
