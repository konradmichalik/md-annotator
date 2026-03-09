import { useCallback } from 'react'
import plantumlEncoder from 'plantuml-encoder'
import { useResolvedTheme } from '../hooks/useResolvedTheme.js'
import { useServerDiagram } from '../hooks/useServerDiagram.js'
import { DiagramShell } from './DiagramShell.jsx'

// Light skinparams match PlantUML defaults visually but force the server to
// compute proper text metrics.  Without explicit params the public PlantUML
// server emits textLength="0" on class‑diagram text elements, producing a
// tiny 188 px layout that breaks in the browser.
const LIGHT_SKINPARAMS = [
  'skinparam backgroundColor transparent',
  'skinparam defaultFontColor #000000',
  'skinparam arrowColor #181818',
  'skinparam classBorderColor #181818',
  'skinparam classBackgroundColor #F1F1F1',
  'skinparam stereotypeCBackgroundColor #ADD1B2',
  'skinparam participantBackgroundColor #FEFECE',
  'skinparam participantBorderColor #A80036',
  'skinparam actorBorderColor #A80036',
  'skinparam sequenceLifeLineBorderColor #A80036',
  'skinparam noteBorderColor #A80036',
  'skinparam noteBackgroundColor #FBFB77',
].join('\n')

const DARK_SKINPARAMS = [
  'skinparam backgroundColor transparent',
  'skinparam defaultFontColor #eceff4',
  'skinparam arrowColor #81a1c1',
  'skinparam classBorderColor #616e88',
  'skinparam classBackgroundColor #434c5e',
  'skinparam stereotypeCBackgroundColor #434c5e',
  'skinparam participantBackgroundColor #434c5e',
  'skinparam participantBorderColor #616e88',
  'skinparam actorBorderColor #616e88',
  'skinparam sequenceLifeLineBorderColor #616e88',
  'skinparam noteBorderColor #616e88',
  'skinparam noteBackgroundColor #3b4252',
].join('\n')

function buildSource(content, isDark) {
  const params = isDark ? DARK_SKINPARAMS : LIGHT_SKINPARAMS
  const lines = content.split('\n')
  const startIdx = lines.findIndex(l => /^@start/.test(l.trim()))
  if (startIdx !== -1) {
    lines.splice(startIdx + 1, 0, params)
    return lines.join('\n')
  }
  return `${params}\n${content}`
}

export function PlantUMLBlock({ block, serverUrl, onDiagramClick, annotationType, hasNote, onNoteClick }) {
  const resolvedTheme = useResolvedTheme()
  const isDark = resolvedTheme === 'dark'
  const source = buildSource(block.content, isDark)

  const buildUrl = useCallback(
    (src) => {
      if (!serverUrl) { return null }
      return `${serverUrl}/svg/${plantumlEncoder.encode(src)}`
    },
    [serverUrl]
  )

  const { svg, error, loading } = useServerDiagram(source, buildUrl, [serverUrl, resolvedTheme])

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
      errorLabel="PlantUML Error"
      language="plantuml"
    />
  )
}
