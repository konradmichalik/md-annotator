import { TOOL_ICONS } from '../utils/icons.jsx'
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
  activeTool, onSelectTool, colorMode, fixedColor, onChangeColorMode, onChangeFixedColor
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
    </div>
  )
}
