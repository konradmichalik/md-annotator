import { useState, useEffect, useCallback, useRef } from 'react'

export function TableOfContents({ blocks, collapsed }) {
  const [activeId, setActiveId] = useState(null)
  const observerRef = useRef(null)
  const tocRef = useRef(null)

  const headings = blocks.filter(b => b.type === 'heading')

  useEffect(() => {
    if (collapsed || headings.length === 0) {
      return
    }

    const viewerEl = document.querySelector('.viewer-container')
    if (!viewerEl) {
      return
    }

    const handleIntersect = (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

      if (visible.length > 0) {
        setActiveId(visible[0].target.getAttribute('data-block-id'))
      }
    }

    observerRef.current = new IntersectionObserver(handleIntersect, {
      root: viewerEl,
      rootMargin: '0px 0px -70% 0px',
      threshold: 0
    })

    headings.forEach(h => {
      const el = viewerEl.querySelector(`[data-block-id="${h.id}"]`)
      if (el) {
        observerRef.current.observe(el)
      }
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [collapsed, headings])

  useEffect(() => {
    if (!activeId || !tocRef.current) {
      return
    }
    const activeEl = tocRef.current.querySelector(`[data-toc-id="${activeId}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeId])

  const handleClick = useCallback((blockId) => {
    const viewerEl = document.querySelector('.viewer-container')
    const target = viewerEl?.querySelector(`[data-block-id="${blockId}"]`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  if (collapsed || headings.length === 0) {
    return null
  }

  return (
    <nav className="toc-panel" ref={tocRef}>
      <div className="toc-header">
        <h2>Contents</h2>
      </div>
      <ul className="toc-list">
        {headings.map(h => (
          <li key={h.id}>
            <button
              className={`toc-item toc-item--level-${h.level}${activeId === h.id ? ' toc-item--active' : ''}`}
              data-toc-id={h.id}
              onClick={() => handleClick(h.id)}
              title={h.content}
            >
              {h.content}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
