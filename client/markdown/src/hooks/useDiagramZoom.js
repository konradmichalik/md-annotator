import { useRef, useEffect, useCallback } from 'react'

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

export function useDiagramZoom({ containerRef, svg, showSource, onDiagramClick, block }) {
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
  }, [containerRef])

  // Reset zoom/pan when content, rendered SVG, or view mode changes
  useEffect(() => {
    zoomLevelRef.current = 1.0
    baseViewBoxRef.current = null
    panOffsetRef.current = { x: 0, y: 0 }
  }, [block.content, svg, showSource])

  // Compute base viewBox and apply initial view
  useEffect(() => {
    if (!svg || showSource || !containerRef.current) { return }

    const svgEl = containerRef.current.querySelector('svg')
    if (!svgEl) { return }

    const vb = svgEl.getAttribute('viewBox')
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number)
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        const base = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
        baseViewBoxRef.current = base
        applyView(svgEl, base, 1.0, { x: 0, y: 0 })
      }
    }
  }, [svg, showSource, containerRef])

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
  }, [showSource, updateZoom, svg, containerRef])

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
  }, [containerRef])

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
  }, [containerRef])

  const openDiagramToolbar = useCallback(() => {
    onDiagramClick?.({
      blockId: block.id,
      element: containerRef.current,
      content: block.content
    })
  }, [onDiagramClick, block.id, block.content, containerRef])

  const handleMouseUp = useCallback((e) => {
    if (!isDraggingRef.current) { return }
    isDraggingRef.current = false
    if (containerRef.current) { containerRef.current.style.cursor = 'grab' }

    if (e && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) { openDiagramToolbar() }
    }
  }, [openDiagramToolbar, containerRef])

  const stopDragging = useCallback(() => {
    if (!isDraggingRef.current) { return }
    isDraggingRef.current = false
    if (containerRef.current) { containerRef.current.style.cursor = 'grab' }
  }, [containerRef])

  return {
    zoomInBtnRef,
    zoomOutBtnRef,
    zoomDisplayRef,
    handleZoomIn,
    handleZoomOut,
    handleFitToScreen,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    stopDragging,
    openDiagramToolbar,
  }
}
