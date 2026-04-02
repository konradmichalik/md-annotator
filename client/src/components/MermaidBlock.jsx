import { useRef, useState, useEffect } from 'react'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'
import { useResolvedTheme, getResolvedTheme } from '../hooks/useResolvedTheme.js'
import { DiagramShell } from './DiagramShell.jsx'

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

export function MermaidBlock({ block, onDiagramClick, annotationType, hasNote, onNoteClick }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)
  const resolvedTheme = useResolvedTheme()
  const renderCountRef = useRef(0)

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
        const sanitized = DOMPurify.sanitize(renderedSvg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['foreignObject'],
        })
        const cleaned = sanitized
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

  return (
    <DiagramShell
      block={block}
      onDiagramClick={onDiagramClick}
      annotationType={annotationType}
      hasNote={hasNote}
      onNoteClick={onNoteClick}
      svg={svg}
      error={error}
      errorLabel="Mermaid Error"
      language="mermaid"
    />
  )
}
