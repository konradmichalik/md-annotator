import { useRef, useState, useCallback, useEffect } from 'react'
import {
  clampPoint, boxFromPoints, findAnnotationAt, translateGeometry,
  annotationCentroid, annotationBottomAnchor, annotationTopAnchor, resizeGeometry, freehandBounds,
  isPointsGeometry, HIGHLIGHTER_OPACITY, dimensionCapLines, DIMENSION_TICK_LENGTH
} from '../utils/drawing.js'
import { resolveArrowStyle, strokeWidthOf, dashArrayFor, DEFAULT_STROKE_WIDTH, pickStyleFields } from '../utils/annotationStyles.js'
import { cursorForTool } from '../utils/cursors.js'
import { ANNOTATION_COLORS } from '../utils/annotationColors.js'
import { ACTION_ICONS } from '../utils/icons.jsx'
import CommentPopover from './CommentPopover.jsx'

const DEFAULT_COLOR = ANNOTATION_COLORS[0].hex
const MOVE_THRESHOLD = 4

/** Tools that draw by capturing a continuous stream of points while dragging. */
function isPointCollectingTool(tool) {
  return tool === 'freehand' || tool === 'highlighter'
}

function pointFromEvent(event, wrapperRef, imageWidth, imageHeight, zoom) {
  const rect = wrapperRef.current.getBoundingClientRect()
  const raw = { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom }
  return clampPoint(raw, imageWidth, imageHeight)
}

/** Convert an image-local point to viewport (client) coordinates, for anchoring a fixed-position popover. */
function toClientPoint(wrapperRef, point, zoom) {
  const rect = wrapperRef.current.getBoundingClientRect()
  return { x: rect.left + point.x * zoom, y: rect.top + point.y * zoom }
}

function BoxShape({ geometry, color, strokeWidth, dash, selectionProps }) {
  const { x, y, width, height } = geometry
  return (
    <>
      {selectionProps && <rect x={x - 3} y={y - 3} width={width + 6} height={height + 6} fill="none" {...selectionProps} />}
      <rect x={x} y={y} width={width} height={height} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={dash} />
    </>
  )
}

function ArrowShape({ annotation, color, strokeWidth, dash, markerId, selectionProps }) {
  const { x1, y1, x2, y2 } = annotation.geometry
  const style = resolveArrowStyle(annotation.arrowStyle)
  // Ticks scale with the shaft's own width, preserving DIMENSION_TICK_LENGTH at the default width.
  const tickLength = (strokeWidth / DEFAULT_STROKE_WIDTH) * DIMENSION_TICK_LENGTH
  const ticks = style === 'dimension' ? dimensionCapLines(annotation.geometry, tickLength) : null
  const markerUrl = `url(#${markerId})`
  const markerEnd = style === 'head' || style === 'double' ? markerUrl : undefined
  const markerStart = style === 'double' ? markerUrl : undefined
  return (
    <>
      {selectionProps && (
        <>
          <line x1={x1} y1={y1} x2={x2} y2={y2} {...selectionProps} />
          {ticks && ticks.map((tick, i) => <line key={i} {...tick} {...selectionProps} />)}
        </>
      )}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={strokeWidth} strokeDasharray={dash}
        markerEnd={markerEnd} markerStart={markerStart}
      />
      {ticks && ticks.map((tick, i) => (
        <line key={i} {...tick} stroke={color} strokeWidth={strokeWidth} />
      ))}
    </>
  )
}

function FreehandShape({ geometry, color, strokeWidth, dash, selectionProps }) {
  const points = geometry.points.map((p) => `${p.x},${p.y}`).join(' ')
  return (
    <>
      {selectionProps && <polyline points={points} fill="none" {...selectionProps} strokeLinecap="round" strokeLinejoin="round" />}
      <polyline
        points={points} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={dash}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </>
  )
}

function HighlighterShape({ geometry, color, strokeWidth, dash, selectionProps }) {
  const points = geometry.points.map((p) => `${p.x},${p.y}`).join(' ')
  return (
    <>
      {selectionProps && (
        <polyline
          points={points} fill="none" stroke="var(--primary)" strokeWidth={strokeWidth + 4}
          strokeOpacity={0.35} strokeLinecap="round" strokeLinejoin="round"
        />
      )}
      <polyline
        points={points} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={dash}
        strokeOpacity={HIGHLIGHTER_OPACITY} strokeLinecap="round" strokeLinejoin="round"
      />
    </>
  )
}

function PinShape({ geometry, color, index, selectionProps }) {
  const { x, y } = geometry
  return (
    <>
      {selectionProps && <circle cx={x} cy={y} r="18" fill="none" {...selectionProps} />}
      <circle cx={x} cy={y} r="14" fill={color} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="13" fontWeight="700">
        {index + 1}
      </text>
    </>
  )
}

function AnnotationShape({ annotation, index, markerId, dashed = false, selected = false }) {
  const color = annotation.color || DEFAULT_COLOR
  const strokeWidth = strokeWidthOf(annotation)
  // The live "uncommitted preview" dash always wins over a stored dashStyle:
  // a not-yet-drawn annotation has no dashStyle chosen yet, and this is the
  // only path where `dashed` is ever true (see the `dashed` prop's call sites).
  const dash = dashed ? '6 4' : dashArrayFor(annotation.dashStyle, strokeWidth)
  const selectionProps = selected ? { stroke: 'var(--primary)', strokeWidth: strokeWidth + 3, strokeOpacity: 0.35 } : null
  const { type, geometry } = annotation

  if (type === 'box') { return <BoxShape geometry={geometry} color={color} strokeWidth={strokeWidth} dash={dash} selectionProps={selectionProps} /> }
  if (type === 'arrow') { return <ArrowShape annotation={annotation} color={color} strokeWidth={strokeWidth} dash={dash} markerId={markerId} selectionProps={selectionProps} /> }
  if (type === 'freehand') { return <FreehandShape geometry={geometry} color={color} strokeWidth={strokeWidth} dash={dash} selectionProps={selectionProps} /> }
  if (type === 'highlighter') { return <HighlighterShape geometry={geometry} color={color} strokeWidth={strokeWidth} dash={dash} selectionProps={selectionProps} /> }
  if (type === 'pin') { return <PinShape geometry={geometry} color={color} index={index} selectionProps={selectionProps} /> }
  return null
}

const BOX_HANDLES = ['nw', 'ne', 'sw', 'se']
const HANDLE_CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' }

function BoxCorners({ x, y, width, height, r, strokeWidth, onHandleMouseDown }) {
  const corners = { nw: [x, y], ne: [x + width, y], sw: [x, y + height], se: [x + width, y + height] }
  return BOX_HANDLES.map((handle) => (
    <circle
      key={handle}
      cx={corners[handle][0]} cy={corners[handle][1]} r={r}
      className="resize-handle"
      style={{ pointerEvents: 'auto', cursor: HANDLE_CURSORS[handle], strokeWidth }}
      onMouseDown={(event) => onHandleMouseDown(event, handle)}
    />
  ))
}

function SelectionHandles({ annotation, zoom, onHandleMouseDown }) {
  const r = 6 / zoom
  const strokeWidth = 2 / zoom
  if (annotation.type === 'box') {
    const { x, y, width, height } = annotation.geometry
    return <BoxCorners x={x} y={y} width={width} height={height} r={r} strokeWidth={strokeWidth} onHandleMouseDown={onHandleMouseDown} />
  }
  if (isPointsGeometry(annotation.type)) {
    const { x, y, width, height } = freehandBounds(annotation.geometry.points)
    return <BoxCorners x={x} y={y} width={width} height={height} r={r} strokeWidth={strokeWidth} onHandleMouseDown={onHandleMouseDown} />
  }
  if (annotation.type === 'arrow') {
    const { x1, y1, x2, y2 } = annotation.geometry
    return (
      <>
        <circle cx={x1} cy={y1} r={r} className="resize-handle" style={{ pointerEvents: 'auto', cursor: 'crosshair', strokeWidth }} onMouseDown={(event) => onHandleMouseDown(event, 'start')} />
        <circle cx={x2} cy={y2} r={r} className="resize-handle" style={{ pointerEvents: 'auto', cursor: 'crosshair', strokeWidth }} onMouseDown={(event) => onHandleMouseDown(event, 'end')} />
      </>
    )
  }
  return null
}

/** Floating Remove/Edit toolbar shown above a selected annotation, mirroring md-annotator's. */
function SelectionToolbar({ point, onEdit, onRemove, onClose }) {
  return (
    <div
      className="annotation-toolbar"
      style={{ top: point.y - 48, left: point.x }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="annotation-toolbar-menu">
        <button type="button" onClick={onRemove} className="annotation-toolbar-btn annotation-toolbar-btn-remove" title="Remove annotation">
          {ACTION_ICONS.remove}
          <span className="annotation-toolbar-label">Remove</span>
        </button>
        <button type="button" onClick={onEdit} className="annotation-toolbar-btn annotation-toolbar-btn-edit" title="Edit comment and color">
          {ACTION_ICONS.edit}
          <span className="annotation-toolbar-label">Edit</span>
        </button>
        <span className="annotation-toolbar-divider" />
        <button type="button" onClick={onClose} className="annotation-toolbar-btn annotation-toolbar-btn-cancel" title="Close" aria-label="Close">
          {ACTION_ICONS.close}
        </button>
      </div>
    </div>
  )
}

export default function ImageCanvas({
  imageUrl, imageWidth, imageHeight, activeTool, annotations, zoom, onZoomBy,
  editingAnnotationId, onAddAnnotation, onUpdateAnnotation, onRemoveAnnotation, onRequestEdit,
  colorMode = 'rotate', fixedColor = DEFAULT_COLOR
}) {
  const wrapperRef = useRef(null)

  // Ctrl/Cmd+scroll to zoom. Attached as a native listener (not React's
  // onWheel) so preventDefault reliably stops the browser's own page-zoom
  // gesture instead of silently no-opping as a passive listener.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) { return }
    const handleWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) { return }
      event.preventDefault()
      onZoomBy(event.deltaY < 0 ? 0.1 : -0.1)
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [onZoomBy])

  const [dragStart, setDragStart] = useState(null)
  const [dragPoint, setDragPoint] = useState(null)
  const [strokePoints, setStrokePoints] = useState([])
  const [pending, setPending] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [hoveringAnnotation, setHoveringAnnotation] = useState(false)
  const [isGrabbing, setIsGrabbing] = useState(false)
  const moveState = useRef(null)
  const resizeState = useRef(null)

  // Delete/Backspace removes the selected annotation, so it doesn't require
  // opening the sidebar. Skipped while the comment popover is open (so
  // Backspace still works for editing text) and while any other text input
  // has focus (e.g. the sidebar's export/import textarea).
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') { return }
      if (!selectedId || pending) { return }
      const tag = document.activeElement?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') { return }
      event.preventDefault()
      onRemoveAnnotation(selectedId)
      setSelectedId(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, pending, onRemoveAnnotation])

  const handleHandleMouseDown = useCallback((event, handle) => {
    event.preventDefault()
    event.stopPropagation()
    const annotation = annotations.find((a) => a.id === selectedId)
    if (!annotation) { return }
    resizeState.current = { id: annotation.id, type: annotation.type, startGeometry: annotation.geometry, handle }
    setIsGrabbing(true)
  }, [annotations, selectedId])

  const openEditPopover = useCallback((annotation) => {
    setPending({
      id: annotation.id,
      type: annotation.type,
      geometry: annotation.geometry,
      color: annotation.color,
      text: annotation.text,
      ...pickStyleFields(annotation.type, annotation),
      anchor: toClientPoint(wrapperRef, annotationBottomAnchor(annotation), zoom)
    })
  }, [zoom])

  // "Edit" clicked in the sidebar: bring the annotation into view, then open
  // the same popover used for click-to-edit-on-the-image.
  useEffect(() => {
    if (!editingAnnotationId) { return }
    const annotation = annotations.find((a) => a.id === editingAnnotationId)
    if (!annotation) { return }

    const appMain = wrapperRef.current?.closest('.app-main')
    const centroid = annotationCentroid(annotation)
    if (appMain) {
      appMain.scrollTo({ top: Math.max(0, centroid.y * zoom - appMain.clientHeight / 2), behavior: 'auto' })
    }

    setSelectedId(annotation.id)
    openEditPopover(annotation)
    onRequestEdit(null)
  }, [editingAnnotationId, annotations, onRequestEdit, zoom, openEditPopover])

  // The starting color for a new annotation: either the next color in the
  // palette (cycling by how many annotations already exist, so multiple
  // markings on one image stay visually distinguishable) or a fixed color
  // the user picked in Settings. Either way it's just a starting point - the
  // comment popover still lets the color be changed per annotation, and
  // editing an existing annotation keeps its stored color untouched.
  const nextColor = colorMode === 'fixed'
    ? fixedColor
    : ANNOTATION_COLORS[annotations.length % ANNOTATION_COLORS.length].hex

  const handleMouseDown = useCallback((event) => {
    // A mousedown that closes the open popover (see CommentPopover's own
    // outside-click handler) reaches this handler too, since the popover's
    // dismissal doesn't stop propagation to the canvas. This early return is
    // what keeps that same click from also starting a new draw underneath
    // the popover - it works because `pending` is state (not a ref), so this
    // closure still sees it as truthy even though CommentPopover's listener
    // already called setPending(null) via onClose in the same event.
    if (pending) { return }
    event.preventDefault()
    const point = pointFromEvent(event, wrapperRef, imageWidth, imageHeight, zoom)

    // An existing annotation under the cursor always takes over, regardless
    // of the active drawing tool: a drag moves it. A click selects it (so its
    // resize handles appear) — clicking it again while already selected is
    // what opens its edit popover, so a plain first click never hides the
    // handles behind the popover.
    const hit = findAnnotationAt(point, annotations)
    if (hit) {
      const wasSelected = hit.id === selectedId
      setSelectedId(hit.id)
      setIsGrabbing(true)
      moveState.current = { id: hit.id, type: hit.type, startGeometry: hit.geometry, startPoint: point, moved: false, wasSelected }
      return
    }

    if (activeTool === 'select') {
      setSelectedId(null)
      return
    }

    if (activeTool === 'pin') {
      const geometry = point
      setPending({ type: 'pin', geometry, color: nextColor, anchor: toClientPoint(wrapperRef, annotationBottomAnchor({ type: 'pin', geometry }), zoom) })
      return
    }

    if (isPointCollectingTool(activeTool)) {
      setStrokePoints([point])
      return
    }

    setDragStart(point)
    setDragPoint(point)
  }, [activeTool, imageWidth, imageHeight, zoom, pending, annotations, selectedId, nextColor])

  const handleMouseMove = useCallback((event) => {
    if (resizeState.current) {
      const point = pointFromEvent(event, wrapperRef, imageWidth, imageHeight, zoom)
      const { id, type, startGeometry, handle } = resizeState.current
      onUpdateAnnotation(id, { geometry: resizeGeometry(type, startGeometry, handle, point) })
      return
    }

    if (moveState.current) {
      const point = pointFromEvent(event, wrapperRef, imageWidth, imageHeight, zoom)
      const { id, type, startGeometry, startPoint } = moveState.current
      const dx = point.x - startPoint.x
      const dy = point.y - startPoint.y
      if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
        moveState.current.moved = true
        onUpdateAnnotation(id, { geometry: translateGeometry(type, startGeometry, dx, dy) })
      }
      return
    }

    if (isPointCollectingTool(activeTool) && strokePoints.length > 0) {
      const point = pointFromEvent(event, wrapperRef, imageWidth, imageHeight, zoom)
      setStrokePoints((prev) => [...prev, point])
      return
    }

    if ((activeTool === 'box' || activeTool === 'arrow') && dragStart) {
      setDragPoint(pointFromEvent(event, wrapperRef, imageWidth, imageHeight, zoom))
      return
    }

    if (!pending) {
      const point = pointFromEvent(event, wrapperRef, imageWidth, imageHeight, zoom)
      setHoveringAnnotation(!!findAnnotationAt(point, annotations))
    }
  }, [activeTool, strokePoints.length, dragStart, imageWidth, imageHeight, zoom, onUpdateAnnotation, pending, annotations])

  const handleMouseUp = useCallback((event) => {
    if (pending) { return }
    if (resizeState.current) {
      resizeState.current = null
      setIsGrabbing(false)
      return
    }

    if (moveState.current) {
      const { id, moved, wasSelected } = moveState.current
      moveState.current = null
      setIsGrabbing(false)
      if (!moved && wasSelected) {
        // A click on an already-selected shape: open its edit popover. A
        // first click only selects it (so the handles and the Remove/Edit
        // toolbar stay visible instead of being immediately hidden behind
        // the popover).
        const annotation = annotations.find((a) => a.id === id)
        if (annotation) { openEditPopover(annotation) }
      }
      return
    }

    const point = pointFromEvent(event, wrapperRef, imageWidth, imageHeight, zoom)

    if (activeTool === 'box' && dragStart) {
      const geometry = boxFromPoints(dragStart, point)
      setDragStart(null)
      setDragPoint(null)
      if (geometry.width > 2 && geometry.height > 2) {
        setPending({
          type: 'box', geometry, color: nextColor,
          anchor: toClientPoint(wrapperRef, annotationBottomAnchor({ type: 'box', geometry }), zoom)
        })
      }
    } else if (activeTool === 'arrow' && dragStart) {
      setDragStart(null)
      setDragPoint(null)
      const geometry = { x1: dragStart.x, y1: dragStart.y, x2: point.x, y2: point.y }
      setPending({
        type: 'arrow', geometry, color: nextColor, arrowStyle: 'head',
        anchor: toClientPoint(wrapperRef, annotationBottomAnchor({ type: 'arrow', geometry }), zoom)
      })
    } else if (isPointCollectingTool(activeTool) && strokePoints.length > 0) {
      if (strokePoints.length > 1) {
        const geometry = { points: strokePoints }
        setPending({
          type: activeTool, geometry, color: nextColor,
          anchor: toClientPoint(wrapperRef, annotationBottomAnchor({ type: activeTool, geometry }), zoom)
        })
      }
      // Always clear, even for a single-point "click, no drag": otherwise
      // handleMouseMove's `strokePoints.length > 0` check keeps matching and
      // a stray stroke follows the cursor with no button held, until the
      // next mousedown happens to reset it.
      setStrokePoints([])
    }
  }, [activeTool, dragStart, strokePoints, imageWidth, imageHeight, zoom, annotations, openEditPopover, nextColor, pending])

  const handleCommentSubmit = useCallback((fields) => {
    if (pending) {
      const { text, color } = fields
      const styleFields = pickStyleFields(pending.type, fields)
      if (pending.id) {
        onUpdateAnnotation(pending.id, { text, color, ...styleFields })
      } else {
        onAddAnnotation({ type: pending.type, geometry: pending.geometry, text, color, ...styleFields })
      }
    }
    setPending(null)
  }, [pending, onAddAnnotation, onUpdateAnnotation])

  const handleCommentClose = useCallback(() => {
    setPending(null)
  }, [])

  const selectedAnnotation = selectedId ? annotations.find((a) => a.id === selectedId) : null

  let livePreview = null
  if (activeTool === 'box' && dragStart && dragPoint) {
    livePreview = { type: 'box', geometry: boxFromPoints(dragStart, dragPoint), color: nextColor }
  } else if (activeTool === 'arrow' && dragStart && dragPoint) {
    livePreview = { type: 'arrow', geometry: { x1: dragStart.x, y1: dragStart.y, x2: dragPoint.x, y2: dragPoint.y }, color: nextColor, arrowStyle: 'head' }
  } else if (isPointCollectingTool(activeTool) && strokePoints.length > 1) {
    livePreview = { type: activeTool, geometry: { points: strokePoints }, color: nextColor }
  }

  let cursor = cursorForTool(activeTool)
  if (hoveringAnnotation) { cursor = 'grab' }
  if (isGrabbing) { cursor = 'grabbing' }

  return (
    <div
      ref={wrapperRef}
      className="image-canvas-wrapper"
      style={{ width: imageWidth * zoom, height: imageHeight * zoom, cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <img src={imageUrl} alt="Captured page" width={imageWidth * zoom} height={imageHeight * zoom} draggable={false} />
      <svg
        className="annotation-overlay"
        width={imageWidth * zoom} height={imageHeight * zoom}
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      >
        <defs>
          <marker id="arrowhead-preview" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill={nextColor} />
          </marker>
          {annotations.map((annotation) => annotation.type === 'arrow'
            && ['head', 'double'].includes(resolveArrowStyle(annotation.arrowStyle)) && (
            <marker
              key={`marker-${annotation.id}`}
              id={`arrowhead-${annotation.id}`}
              markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 Z" fill={annotation.color || DEFAULT_COLOR} />
            </marker>
          ))}
        </defs>
        {annotations.map((annotation, index) => (
          <AnnotationShape key={annotation.id} annotation={annotation} index={index} markerId={`arrowhead-${annotation.id}`} selected={annotation.id === selectedId} />
        ))}
        {pending && !pending.id && <AnnotationShape annotation={pending} index={annotations.length} markerId="arrowhead-preview" />}
        {!pending && livePreview && <AnnotationShape annotation={livePreview} index={annotations.length} markerId="arrowhead-preview" dashed />}
        {!pending && selectedAnnotation && (
          <SelectionHandles annotation={selectedAnnotation} zoom={zoom} onHandleMouseDown={handleHandleMouseDown} />
        )}
      </svg>
      {!pending && selectedAnnotation && (
        <SelectionToolbar
          point={toClientPoint(wrapperRef, annotationTopAnchor(selectedAnnotation), zoom)}
          onEdit={() => openEditPopover(selectedAnnotation)}
          onRemove={() => {
            onRemoveAnnotation(selectedAnnotation.id)
            setSelectedId(null)
          }}
          onClose={() => setSelectedId(null)}
        />
      )}
      {pending && (
        <CommentPopover
          anchorPoint={pending.anchor}
          initialText={pending.text || ''}
          initialColor={pending.color}
          annotationType={pending.type}
          initialArrowStyle={pending.arrowStyle}
          initialStrokeWidth={pending.strokeWidth}
          initialDashStyle={pending.dashStyle}
          isEditing={!!pending.id}
          onSubmit={handleCommentSubmit}
          onClose={handleCommentClose}
        />
      )}
    </div>
  )
}
