import { useRef, useState } from 'react'
import { useDiagramZoom } from '../hooks/useDiagramZoom.js'

export function DiagramShell({ block, onDiagramClick, annotationType, hasNote, onNoteClick, svg, error, loading, errorLabel, language }) {
  const containerRef = useRef(null)
  const [showSource, setShowSource] = useState(false)

  const zoom = useDiagramZoom({
    containerRef,
    svg,
    showSource,
    onDiagramClick,
    block,
  })

  if (error) {
    return (
      <div className="diagram-error" data-block-id={block.id}>
        <div className="diagram-error-header">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{errorLabel}</span>
        </div>
        <pre className="diagram-error-message">{error}</pre>
        <pre className="diagram-error-source"><code>{block.content}</code></pre>
      </div>
    )
  }

  return (
    <div className={`diagram-block${hasNote ? ' block-has-note' : ''}`} data-block-id={block.id}>
      {hasNote && (
        <span
          className="block-note-border"
          onClick={(e) => { e.stopPropagation(); onNoteClick?.(block.id) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onNoteClick?.(block.id) } }}
          title="AI Note — click to view"
          role="button"
          tabIndex={0}
          aria-label="View AI note"
        />
      )}
      {/* Controls */}
      <div className="diagram-controls">
        <button
          onClick={() => setShowSource(!showSource)}
          className="diagram-ctrl-btn"
          title={showSource ? 'Show diagram' : 'Show source'}
        >
          {showSource ? (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          )}
        </button>

        {!showSource && svg && (
          <div className="diagram-zoom-controls">
            <button
              ref={zoom.zoomInBtnRef}
              onClick={zoom.handleZoomIn}
              className="diagram-zoom-btn"
              title="Zoom in"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              onClick={zoom.handleFitToScreen}
              className="diagram-zoom-btn"
              title="Fit to screen"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
            </button>
            <button
              ref={zoom.zoomOutBtnRef}
              onClick={zoom.handleZoomOut}
              className="diagram-zoom-btn"
              title="Zoom out"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <span ref={zoom.zoomDisplayRef} hidden className="diagram-zoom-display" />
          </div>
        )}
      </div>

      {/* Source code (always in DOM for sizing) */}
      <pre className={`block-code diagram-source${!showSource ? ' diagram-source--hidden' : ''}`}>
        <code className={`hljs language-${language}`}>{block.content}</code>
      </pre>

      {/* Loading indicator */}
      {loading && !showSource && (
        <div className="diagram-overlay diagram-loading">
          <div className="diagram-spinner" />
        </div>
      )}

      {/* Diagram overlay */}
      {!showSource && !loading && svg && (
        <div
          ref={containerRef}
          className={`diagram-overlay${annotationType === 'DELETION' ? ' annotated-deletion' : annotationType ? ' annotated-comment' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Annotate diagram"
          dangerouslySetInnerHTML={{ __html: svg }}
          onMouseDown={zoom.handleMouseDown}
          onMouseMove={zoom.handleMouseMove}
          onMouseUp={zoom.handleMouseUp}
          onMouseLeave={zoom.stopDragging}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              zoom.openDiagramToolbar()
            }
          }}
        />
      )}
    </div>
  )
}
