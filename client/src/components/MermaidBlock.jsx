import { useRef, useState, useEffect, useCallback } from 'react'
import mermaid from 'mermaid'

const DARK_THEME = {
  theme: 'dark',
  themeVariables: {
    primaryColor: '#434c5e',
    primaryTextColor: '#eceff4',
    primaryBorderColor: '#616e88',
    lineColor: '#81a1c1',
    secondaryColor: '#434c5e',
    tertiaryColor: '#3b4252',
    background: '#2e3440',
    mainBkg: '#434c5e',
    nodeBorder: '#616e88',
    clusterBkg: '#3b4252',
    clusterBorder: '#616e88',
    titleColor: '#eceff4',
    edgeLabelBackground: '#3b4252',
  },
}

const LIGHT_THEME = {
  theme: 'default',
  themeVariables: {
    primaryColor: '#ffffff',
    primaryTextColor: '#2e3440',
    primaryBorderColor: '#b8c5d6',
    lineColor: '#4c566a',
    secondaryColor: '#ffffff',
    tertiaryColor: '#e8ecf1',
    background: '#f0f2f5',
    mainBkg: '#ffffff',
    nodeBorder: '#b8c5d6',
    clusterBkg: '#e8ecf1',
    clusterBorder: '#b8c5d6',
    titleColor: '#2e3440',
    edgeLabelBackground: '#ffffff',
  },
}

function getResolvedTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light'
}

function initMermaid(isDark) {
  const vars = isDark ? DARK_THEME : LIGHT_THEME
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    ...vars,
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
    },
  })
}

// Initialize with current theme
initMermaid(getResolvedTheme() === 'dark')

function useResolvedTheme() {
  const [resolved, setResolved] = useState(getResolvedTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setResolved(getResolvedTheme())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return resolved
}

const ZOOM_STEP = 0.25
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4.0

function applyView(svgEl, base, zoom, pan) {
  const zoomedWidth = base.width / zoom
  const zoomedHeight = base.height / zoom
  const centerX = base.x + base.width / 2
  const centerY = base.y + base.height / 2
  const vbX = centerX - zoomedWidth / 2 + pan.x
  const vbY = centerY - zoomedHeight / 2 + pan.y
  svgEl.setAttribute('viewBox', `${vbX} ${vbY} ${zoomedWidth} ${zoomedHeight}`)
}

export function MermaidBlock({ block }) {
  const containerRef = useRef(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)
  const [showSource, setShowSource] = useState(false)
  const resolvedTheme = useResolvedTheme()
  const renderCountRef = useRef(0)

  const zoomLevelRef = useRef(1.0)
  const isDraggingRef = useRef(false)
  const baseViewBoxRef = useRef(null)
  const panOffsetRef = useRef({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const panStartRef = useRef({ x: 0, y: 0 })

  const zoomInBtnRef = useRef(null)
  const zoomOutBtnRef = useRef(null)
  const zoomDisplayRef = useRef(null)

  const updateZoom = useCallback((newZoom) => {
    zoomLevelRef.current = newZoom

    if (containerRef.current && baseViewBoxRef.current) {
      const svgEl = containerRef.current.querySelector('svg')
      if (svgEl) { applyView(svgEl, baseViewBoxRef.current, newZoom, panOffsetRef.current) }
    }

    if (zoomInBtnRef.current) { zoomInBtnRef.current.disabled = newZoom >= MAX_ZOOM }
    if (zoomOutBtnRef.current) { zoomOutBtnRef.current.disabled = newZoom <= MIN_ZOOM }
    if (zoomDisplayRef.current) {
      const show = Math.abs(newZoom - 1.0) > 0.001
      zoomDisplayRef.current.textContent = show ? `${Math.round(newZoom * 100)}%` : ''
      zoomDisplayRef.current.hidden = !show
    }
  }, [])

  // Render mermaid diagram (re-renders on content or theme change)
  useEffect(() => {
    const isDark = resolvedTheme === 'dark'
    initMermaid(isDark)

    let cancelled = false
    const renderDiagram = async () => {
      try {
        renderCountRef.current += 1
        const renderId = renderCountRef.current
        const safeContent = block.content.replace(/%%\s*\{[^}]*\}\s*%%/g, '')
        const id = `mermaid-${block.id}-${renderId}`
        const { svg: renderedSvg } = await mermaid.render(id, safeContent)
        if (cancelled) { return }
        const cleaned = renderedSvg
          .replace(/ width="[^"]*"/, ' width="100%"')
          .replace(/ height="[^"]*"/, ' height="100%"')
          .replace(/ style="[^"]*"/, '')
        setSvg(cleaned)
        setError(null)
      } catch (err) {
        if (cancelled) { return }
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
        setSvg('')
      }
    }

    renderDiagram()
    return () => { cancelled = true }
  }, [block.content, block.id, resolvedTheme])

  // Reset zoom/pan when content, theme, or view mode changes
  useEffect(() => {
    zoomLevelRef.current = 1.0
    baseViewBoxRef.current = null
    panOffsetRef.current = { x: 0, y: 0 }
  }, [block.content, resolvedTheme, showSource])

  // Compute base viewBox and apply initial view
  useEffect(() => {
    if (!svg || showSource || !containerRef.current) { return }

    const svgEl = containerRef.current.querySelector('svg')
    if (!svgEl) { return }

    try {
      const contentGroup = svgEl.querySelector('g')
      if (!contentGroup) { return }

      const bbox = contentGroup.getBBox()
      const padding = 8
      const base = {
        x: bbox.x - padding,
        y: bbox.y - padding,
        width: bbox.width + padding * 2,
        height: bbox.height + padding * 2,
      }

      baseViewBoxRef.current = base
      applyView(svgEl, base, 1.0, { x: 0, y: 0 })
    } catch (_e) {
      // Ignore errors from getBBox on hidden elements
    }
  }, [svg, showSource])

  // Wheel zoom
  useEffect(() => {
    if (showSource || !containerRef.current) { return }

    const container = containerRef.current
    const handleWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevelRef.current + delta))
      updateZoom(newZoom)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [showSource, updateZoom, svg])

  const handleZoomIn = useCallback(() => {
    updateZoom(Math.min(zoomLevelRef.current + ZOOM_STEP, MAX_ZOOM))
  }, [updateZoom])

  const handleZoomOut = useCallback(() => {
    updateZoom(Math.max(zoomLevelRef.current - ZOOM_STEP, MIN_ZOOM))
  }, [updateZoom])

  const handleFitToScreen = useCallback(() => {
    panOffsetRef.current = { x: 0, y: 0 }
    updateZoom(1.0)
  }, [updateZoom])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) { return }
    e.preventDefault()
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    panStartRef.current = { ...panOffsetRef.current }
    if (containerRef.current) { containerRef.current.style.cursor = 'grabbing' }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || !containerRef.current || !baseViewBoxRef.current) { return }

    const svgEl = containerRef.current.querySelector('svg')
    if (!svgEl) { return }

    const rect = svgEl.getBoundingClientRect()
    const base = baseViewBoxRef.current
    const zoom = zoomLevelRef.current
    const scaleX = (base.width / zoom) / rect.width
    const scaleY = (base.height / zoom) / rect.height

    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y

    panOffsetRef.current = {
      x: panStartRef.current.x - dx * scaleX,
      y: panStartRef.current.y - dy * scaleY,
    }

    applyView(svgEl, base, zoom, panOffsetRef.current)
  }, [])

  const stopDragging = useCallback(() => {
    if (!isDraggingRef.current) { return }
    isDraggingRef.current = false
    if (containerRef.current) { containerRef.current.style.cursor = 'grab' }
  }, [])

  if (error) {
    return (
      <div className="mermaid-error" data-block-id={block.id}>
        <div className="mermaid-error-header">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Mermaid Error</span>
        </div>
        <pre className="mermaid-error-message">{error}</pre>
        <pre className="mermaid-error-source"><code>{block.content}</code></pre>
      </div>
    )
  }

  return (
    <div className="mermaid-block" data-block-id={block.id}>
      {/* Controls */}
      <div className="mermaid-controls">
        <button
          onClick={() => setShowSource(!showSource)}
          className="mermaid-ctrl-btn"
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
          <div className="mermaid-zoom-controls">
            <button
              ref={zoomInBtnRef}
              onClick={handleZoomIn}
              className="mermaid-zoom-btn"
              title="Zoom in"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              onClick={handleFitToScreen}
              className="mermaid-zoom-btn"
              title="Fit to screen"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
            </button>
            <button
              ref={zoomOutBtnRef}
              onClick={handleZoomOut}
              className="mermaid-zoom-btn"
              title="Zoom out"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <span ref={zoomDisplayRef} hidden className="mermaid-zoom-display" />
          </div>
        )}
      </div>

      {/* Source code (always in DOM for sizing) */}
      <pre className={`block-code mermaid-source${!showSource ? ' mermaid-source--hidden' : ''}`}>
        <code className="hljs language-mermaid">{block.content}</code>
      </pre>

      {/* Diagram overlay */}
      {!showSource && svg && (
        <div
          ref={containerRef}
          className="mermaid-diagram"
          dangerouslySetInnerHTML={{ __html: svg }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
        />
      )}
    </div>
  )
}
