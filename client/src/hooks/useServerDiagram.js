import { useRef, useState, useEffect } from 'react'
import DOMPurify from 'dompurify'

function normalizeSvg(raw) {
  let svg = DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true } })

  // Synthesize viewBox from width/height if missing (e.g. ditaa SVGs)
  if (!(/viewBox\s*=/.test(svg))) {
    const wMatch = svg.match(/<svg[^>]*\swidth="([^"]*)"/)
    const hMatch = svg.match(/<svg[^>]*\sheight="([^"]*)"/)
    const w = wMatch && parseFloat(wMatch[1])
    const h = hMatch && parseFloat(hMatch[1])
    if (w && h) {
      svg = svg.replace(/<svg(\s)/, `<svg viewBox="0 0 ${w} ${h}"$1`)
    }
  }

  // Normalize preserveAspectRatio
  if (/preserveAspectRatio="[^"]*"/.test(svg)) {
    svg = svg.replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMidYMid meet"')
  } else {
    svg = svg.replace(/<svg(\s)/, '<svg preserveAspectRatio="xMidYMid meet"$1')
  }

  // Remove fixed dimensions and inline styles — let the SVG scale via viewBox.
  // CSS handles centering and max-width constraints.
  svg = svg.replace(/(<svg[^>]*)\swidth="[^"]*"/, '$1')
  svg = svg.replace(/(<svg[^>]*)\sheight="[^"]*"/, '$1')
  svg = svg.replace(/(<svg[^>]*)\sstyle="[^"]*"/, '$1')

  // Make white background fills transparent so the diagram adapts to the
  // container's theme background (Graphviz polygons, D2/ditaa rects, etc.)
  svg = svg.replace(/fill="(white|#fff(?:fff)?|#FFFFFF)"/gi, 'fill="transparent"')

  return svg
}

export function useServerDiagram(source, buildUrl, deps = []) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const cacheRef = useRef(new Map())

  useEffect(() => {
    const url = buildUrl(source)
    if (!url) {
      setSvg('')
      setError(null)
      setLoading(false)
      return
    }

    const cached = cacheRef.current.get(url)
    if (cached) {
      setSvg(cached)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const fetchDiagram = async () => {
      setSvg('')
      setError(null)
      setLoading(true)
      try {
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`)
        }
        const text = await res.text()
        if (cancelled) { return }

        const cleaned = normalizeSvg(text)

        cacheRef.current.set(url, cleaned)
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
  }, [source, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  return { svg, error, loading }
}
