import { useEffect, useRef } from 'react'

export function SearchBar({ query, setQuery, matchCount, activeIndex, stepMatch, closeSearch }) {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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

  const countLabel = query
    ? matchCount > 0
      ? `${activeIndex + 1} of ${matchCount}`
      : 'No results'
    : ''

  return (
    <div className="search-bar" role="search">
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
        placeholder="Find in document..."
        autoComplete="off"
        spellCheck="false"
      />
      {countLabel && <span className="search-count">{countLabel}</span>}
      <button
        className="search-bar-btn"
        onClick={() => stepMatch(-1)}
        disabled={matchCount === 0}
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
        disabled={matchCount === 0}
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
    </div>
  )
}
