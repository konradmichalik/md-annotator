import { useEffect, useRef, useState } from 'react'

export function SearchBar({ query, setQuery, matchCount, activeIndex, stepMatch, closeSearch, fileMatches, activeFileIndex, onSelectFile }) {
  const inputRef = useRef(null)
  const [showFiles, setShowFiles] = useState(false)

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
      if (showFiles) {
        setShowFiles(false)
      } else if (query) {
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

  const hasMultiFileResults = fileMatches?.some(f => f.count > 0)
  const totalCrossFileMatches = hasMultiFileResults
    ? fileMatches.reduce((sum, f) => sum + f.count, 0)
    : 0

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
      {hasMultiFileResults && (
        <button
          className="search-bar-btn search-files-toggle"
          onClick={() => setShowFiles(prev => !prev)}
          title="Show matches across files"
          aria-label="Show matches across files"
          aria-expanded={showFiles}
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="search-files-total">{totalCrossFileMatches}</span>
        </button>
      )}
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
      {showFiles && fileMatches && (
        <div className="search-file-matches" role="listbox" aria-label="Matches per file">
          {fileMatches.map((fm, i) => (
            <button
              key={fm.path}
              role="option"
              aria-selected={i === activeFileIndex}
              className={`search-file-match${i === activeFileIndex ? ' search-file-match--active' : ''}`}
              onClick={() => {
                onSelectFile?.(i)
                setShowFiles(false)
              }}
              disabled={fm.count === 0}
            >
              <span className="search-file-match-name">{fm.path.split(/[\\/]/).pop()}</span>
              <span className={`search-file-match-count${fm.count === 0 ? ' search-file-match-count--zero' : ''}`}>
                {fm.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
