import { ZOOM_ICONS } from '../utils/icons.jsx'

export default function ZoomControls({ zoom, onZoomBy, onZoomReset, onZoomFit }) {
  return (
    <div className="zoom-controls" role="toolbar" aria-label="Zoom controls">
      <button type="button" onClick={() => onZoomBy(-0.1)} title="Zoom out" aria-label="Zoom out">
        {ZOOM_ICONS.out}
      </button>
      <button type="button" className="toolbar-zoom-level" onClick={onZoomReset} title="Reset zoom to 100%">
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" onClick={() => onZoomBy(0.1)} title="Zoom in" aria-label="Zoom in">
        {ZOOM_ICONS.in}
      </button>
      <button type="button" onClick={onZoomFit} title="Fit whole image in view" aria-label="Fit whole image in view">
        {ZOOM_ICONS.fit}
      </button>
    </div>
  )
}
