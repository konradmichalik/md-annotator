import { useCallback } from 'react'
import pako from 'pako'
import { useServerDiagram } from '../hooks/useServerDiagram.js'
import { DiagramShell } from './DiagramShell.jsx'

export const KROKI_LANGUAGES = new Map([
  ['graphviz', 'graphviz'],
  ['dot', 'graphviz'],
  ['d2', 'd2'],
  ['ditaa', 'ditaa'],
  ['dbml', 'dbml'],
  ['erd', 'erd'],
  ['nomnoml', 'nomnoml'],
  ['svgbob', 'svgbob'],
  ['pikchr', 'pikchr'],
  ['excalidraw', 'excalidraw'],
  ['bpmn', 'bpmn'],
  ['bytefield', 'bytefield'],
  ['c4', 'c4plantuml'],
  ['c4plantuml', 'c4plantuml'],
  ['structurizr', 'structurizr'],
  ['vega', 'vega'],
  ['vega-lite', 'vegalite'],
  ['vegalite', 'vegalite'],
  ['wavedrom', 'wavedrom'],
  ['wireviz', 'wireviz'],
  ['blockdiag', 'blockdiag'],
  ['seqdiag', 'seqdiag'],
  ['actdiag', 'actdiag'],
  ['nwdiag', 'nwdiag'],
  ['packetdiag', 'packetdiag'],
  ['rackdiag', 'rackdiag'],
  ['tikz', 'tikz'],
  ['umlet', 'umlet'],
  ['symbolator', 'symbolator'],
])

function encodeKroki(source) {
  const data = new TextEncoder().encode(source)
  const compressed = pako.deflate(data, { level: 9 })
  const binary = String.fromCharCode.apply(null, compressed)
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function KrokiBlock({ block, serverUrl, onDiagramClick, annotationType, hasNote, onNoteClick }) {
  const krokiFormat = KROKI_LANGUAGES.get(block.language) || block.language

  const buildUrl = useCallback(
    (src) => {
      if (!serverUrl) { return null }
      return `${serverUrl}/${krokiFormat}/svg/${encodeKroki(src)}`
    },
    [serverUrl, krokiFormat]
  )

  const { svg, error, loading } = useServerDiagram(block.content, buildUrl, [serverUrl, krokiFormat])

  return (
    <DiagramShell
      block={block}
      onDiagramClick={onDiagramClick}
      annotationType={annotationType}
      hasNote={hasNote}
      onNoteClick={onNoteClick}
      svg={svg}
      error={error}
      loading={loading}
      errorLabel="Kroki Error"
      language={block.language}
    />
  )
}
