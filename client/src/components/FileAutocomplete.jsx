import { useEffect, useRef } from 'react'

export function FileAutocomplete({ items, activeIndex, onSelect }) {
  const listRef = useRef(null)

  useEffect(() => {
    const active = listRef.current?.children[activeIndex]
    if (active) {
      active.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  if (items.length === 0) { return null }

  return (
    <div className="file-autocomplete" role="listbox">
      <ul ref={listRef} className="file-autocomplete-list">
        {items.map((file, i) => (
          <li
            key={file}
            role="option"
            aria-selected={i === activeIndex}
            className={`file-autocomplete-item${i === activeIndex ? ' active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(i)
            }}
          >
            <span className="file-autocomplete-icon">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <span className="file-autocomplete-path">{file}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
