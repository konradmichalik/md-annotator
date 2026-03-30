import { useEffect, useRef } from 'react'

function basename(filePath) {
  return filePath.split('/').pop() || filePath
}

export function SearchBar({
  query, setQuery, matchCount, activeIndex, stepMatch, closeSearch,
  crossFileResults, activeResultIndex, onSelectResult,
}) {
  const inputRef = useRef(null)
  const resultsRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Scroll the active cross-file result into view
  useEffect(() => {
    if (!resultsRef.current || activeResultIndex === undefined || activeResultIndex === null) { return }
    const active = resultsRef.current.querySelector('.search-cross-match--active')
    if (active) {
      active.scrollIntoView({ block: 'nearest' })
    }
  }, [activeResultIndex])

  const handleKeyDown = (e) => {
    e.stopPropagation()

    // Block browser find when search bar is already open
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault()
      inputRef.current?.select()
      return
    }

    if (e.key === 'Escape') {
      if (query) {
        setQuery('')
      } else {
        closeSearch()
      }
      return
    }

    if (e.key === 'Enter' || e.key === 'F3') {
      e.preventDefault()
      if (e.shiftKey) {
        stepMatch(-1)
      } else {
        stepMatch(+1)
      }
    }
  }

  const isCrossFile = crossFileResults && crossFileResults.length > 0
  const totalCrossMatches = isCrossFile
    ? crossFileResults.reduce((sum, g) => sum + g.matches.length, 0)
    : 0

  const countLabel = query
    ? isCrossFile
      ? totalCrossMatches > 0
        ? `${(activeResultIndex ?? 0) + 1} of ${totalCrossMatches}`
        : 'No results'
      : matchCount > 0
        ? `${activeIndex + 1} of ${matchCount}`
        : 'No results'
    : ''

  // Build flat index for cross-file results to track active state
  let flatIdx = 0

  return (
    <div className={`search-bar${isCrossFile && query ? ' search-bar--cross-file' : ''}`} role="search">
      <label htmlFor="search-input" className="sr-only">Search in document</label>
      <svg className="search-bar-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        id="search-input"
        type="text"
        className="search-bar-input"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isCrossFile ? 'Find across all files...' : 'Find in document...'}
        autoComplete="off"
        spellCheck="false"
      />
      {countLabel && <span className="search-count">{countLabel}</span>}
      <button
        className="search-bar-btn"
        onClick={() => stepMatch(-1)}
        disabled={isCrossFile ? totalCrossMatches === 0 : matchCount === 0}
        title="Previous match (Shift+Enter)"
        aria-label="Previous match"
        type="button"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        className="search-bar-btn"
        onClick={() => stepMatch(+1)}
        disabled={isCrossFile ? totalCrossMatches === 0 : matchCount === 0}
        title="Next match (Enter)"
        aria-label="Next match"
        type="button"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <button
        className="search-bar-btn"
        onClick={closeSearch}
        title="Close search (Escape)"
        aria-label="Close search"
        type="button"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {isCrossFile && query && totalCrossMatches > 0 && (
        <div className="search-cross-results" ref={resultsRef} role="listbox" aria-label="Search results across files">
          {crossFileResults.map((group) => (
            <div key={group.fileIndex} className="search-cross-group">
              <div className="search-cross-group-header">
                <span className="search-cross-filename">{basename(group.filePath)}</span>
                <span className="search-cross-group-count">{group.matches.length}</span>
              </div>
              {group.matches.map((match, mi) => {
                const thisIdx = flatIdx++
                const isActive = thisIdx === activeResultIndex
                return (
                  <button
                    key={mi}
                    className={`search-cross-match${isActive ? ' search-cross-match--active' : ''}`}
                    onClick={() => onSelectResult?.(group.fileIndex, match)}
                    role="option"
                    aria-selected={isActive}
                    type="button"
                  >
                    <span className="search-cross-line">L{match.line}</span>
                    <span className="search-cross-context">{match.context}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
