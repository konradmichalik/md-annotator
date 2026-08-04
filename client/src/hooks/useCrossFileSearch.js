import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { searchAcrossFiles } from '../utils/crossFileSearch.js'

const DEBOUNCE_MS = 200

export function useCrossFileSearch(files) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [activeResultIndex, setActiveResultIndex] = useState(0)
  const debounceRef = useRef(null)

  // isOpen is a dependency so reopening recomputes results for a kept query
  useEffect(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current) }

    if (!isOpen) { return }

    if (!query) {
      setResults([])
      setActiveResultIndex(0)
      return
    }

    debounceRef.current = setTimeout(() => {
      const found = searchAcrossFiles(files, query)
      setResults(found)
      setActiveResultIndex(0)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) { clearTimeout(debounceRef.current) }
    }
  }, [query, isOpen, files])

  const flatMatches = useMemo(() => {
    const flat = []
    for (const group of results) {
      for (const match of group.matches) {
        flat.push({ fileIndex: group.fileIndex, filePath: group.filePath, ...match })
      }
    }
    return flat
  }, [results])

  const totalMatchCount = flatMatches.length

  const activeMatch = flatMatches[activeResultIndex] || null

  const stepMatch = useCallback((delta) => {
    setActiveResultIndex(prev => {
      if (flatMatches.length === 0) { return 0 }
      return (prev + delta + flatMatches.length) % flatMatches.length
    })
  }, [flatMatches])

  const openSearch = useCallback(() => {
    setIsOpen(true)
  }, [])

  // Query kept for the next open — see useDocumentSearch.closeSearch
  const closeSearch = useCallback(() => {
    setResults([])
    setActiveResultIndex(0)
    setIsOpen(false)
  }, [])

  return {
    query,
    setQuery,
    results,
    flatMatches,
    totalMatchCount,
    activeResultIndex,
    activeMatch,
    isOpen,
    openSearch,
    closeSearch,
    stepMatch,
  }
}
