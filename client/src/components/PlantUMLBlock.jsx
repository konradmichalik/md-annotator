import { useRef, useState, useEffect } from 'react'
import DOMPurify from 'dompurify'
import plantumlEncoder from 'plantuml-encoder'
import { useResolvedTheme } from '../hooks/useResolvedTheme.js'
import { DiagramShell } from './DiagramShell.jsx'

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
  if (!isDark) { return content }
  const lines = content.split('\n')
  const startIdx = lines.findIndex(l => /^@start/.test(l.trim()))
  if (startIdx !== -1) {
    lines.splice(startIdx + 1, 0, DARK_SKINPARAMS)
    return lines.join('\n')
  }
  return `${DARK_SKINPARAMS}\n${content}`
}

export function PlantUMLBlock({ block, serverUrl, onDiagramClick, annotationType, hasNote, onNoteClick }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const resolvedTheme = useResolvedTheme()
  const svgCacheRef = useRef(new Map())

  // Fetch rendered SVG from PlantUML server
  useEffect(() => {
    const isDark = resolvedTheme === 'dark'
    const source = buildSource(block.content, isDark)
    const cacheKey = `${source}::${serverUrl}`

    const cached = svgCacheRef.current.get(cacheKey)
    if (cached) {
      setSvg(cached)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const fetchDiagram = async () => {
      setLoading(true)
      try {
        const encoded = plantumlEncoder.encode(source)
        const url = `${serverUrl}/svg/${encoded}`
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error(`PlantUML server returned ${res.status}`)
        }
        const text = await res.text()
        if (cancelled) { return }

        const sanitized = DOMPurify.sanitize(text, { USE_PROFILES: { svg: true } })
        const cleaned = sanitized
          .replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMidYMid meet"')
          .replace(/ width="[^"]*"/, ' width="100%"')
          .replace(/ height="[^"]*"/, '')
          .replace(/ style="[^"]*"/, '')

        svgCacheRef.current.set(cacheKey, cleaned)
        setSvg(cleaned)
        setError(null)
      } catch (err) {
        if (cancelled) { return }
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
        setSvg('')
      } finally {
        if (!cancelled) { setLoading(false) }
      }
    }

    fetchDiagram()
    return () => { cancelled = true }
  }, [block.content, serverUrl, resolvedTheme])

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
