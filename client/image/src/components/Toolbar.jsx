import { TOOL_ICONS, ZOOM_ICONS } from '../utils/icons.jsx'
import ColorModePicker from './ColorModePicker.jsx'

const TOOLS = [
  { id: 'select', label: 'Select' },
  { id: 'box', label: 'Box' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'freehand', label: 'Freehand' },
  { id: 'highlighter', label: 'Highlighter' },
  { id: 'pin', label: 'Pin' }
]

export default function Toolbar({
  activeTool, onSelectTool, zoom, onZoomBy, onZoomReset, onZoomFit,
  colorMode, fixedColor, onChangeColorMode, onChangeFixedColor
}) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Annotation tools">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={activeTool === tool.id ? 'active' : ''}
          aria-pressed={activeTool === tool.id}
          onClick={() => onSelectTool(tool.id)}
        >
          {TOOL_ICONS[tool.id]}
          {tool.label}
        </button>
      ))}
      <div className="toolbar-divider" />
      <ColorModePicker
        colorMode={colorMode}
        fixedColor={fixedColor}
        onChangeMode={onChangeColorMode}
        onChangeColor={onChangeFixedColor}
      />
      <div className="toolbar-divider" />
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
