import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { highlightMatches, setActiveMatch, clearSearchHighlights } from '../utils/searchHighlight.js'

const DEBOUNCE_MS = 150

function countTextMatches(text, query) {
  if (!query || !text) { return 0 }
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  let count = 0
  let pos = 0
  while ((pos = lower.indexOf(q, pos)) !== -1) {
    count++
    pos += q.length
  }
  return count
}

export function useDocumentSearch(containerRef, files) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef(null)

  // Cross-file match counts (text-based, not DOM)
  const fileMatches = useMemo(() => {
    if (!query || !files || files.length <= 1) { return null }
    return files.map(f => ({
      path: f.path,
      count: countTextMatches(f.content, query)
    }))
  }, [query, files])

  // Run search when the query changes or the bar reopens (debounced).
  // Depending on isOpen re-highlights a query that was kept from the last open.
  useEffect(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current) }

    if (!isOpen) { return }

    if (!query) {
      clearSearchHighlights(containerRef.current)
      setMatches([])
      setActiveIndex(0)
      return
    }

    debounceRef.current = setTimeout(() => {
      clearSearchHighlights(containerRef.current)
      const found = highlightMatches(containerRef.current, query)
      setMatches(found)
      setActiveIndex(0)
      if (found.length > 0) {
        setActiveMatch(found, 0)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) { clearTimeout(debounceRef.current) }
    }
  }, [query, isOpen, containerRef])

  // Update active match highlight when activeIndex changes
  useEffect(() => {
    if (matches.length > 0) {
      setActiveMatch(matches, activeIndex)
    }
  }, [activeIndex, matches])

  const stepMatch = useCallback((delta) => {
    setActiveIndex(prev => {
      if (matches.length === 0) { return 0 }
      return (prev + delta + matches.length) % matches.length
    })
  }, [matches])

  const openSearch = useCallback(() => {
    setIsOpen(true)
  }, [])

  // The query survives closing so reopening can offer it again (SearchBar
  // selects it on focus, so typing still replaces it). Escape clears it first.
  const closeSearch = useCallback(() => {
    setMatches([])
    setActiveIndex(0)
    clearSearchHighlights(containerRef.current)
    setIsOpen(false)
  }, [containerRef])

  // Cleanup on unmount
  useEffect(() => {
    const container = containerRef.current
    return () => {
      clearSearchHighlights(container)
    }
  }, [containerRef])

  return {
    query,
    setQuery,
    matches,
    activeIndex,
    matchCount: matches.length,
    isOpen,
    openSearch,
    closeSearch,
    stepMatch,
    fileMatches,
  }
}
