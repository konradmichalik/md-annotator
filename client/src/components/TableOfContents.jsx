import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

/**
 * Build a map: headingBlockId → Set of blockIds that belong to that section.
 * A section spans from a heading to the next heading of equal or higher level.
 */
function buildSectionMap(blocks) {
  const headings = []
  const sectionMap = new Map()

  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'heading') {
      headings.push({ index: i, id: blocks[i].id, level: blocks[i].level })
      sectionMap.set(blocks[i].id, new Set())
    }
  }

  for (let hi = 0; hi < headings.length; hi++) {
    const start = headings[hi].index + 1
    const sectionBlocks = sectionMap.get(headings[hi].id)

    for (let i = start; i < blocks.length; i++) {
      if (blocks[i].type === 'heading') {
        break
      }
      sectionBlocks.add(blocks[i].id)
    }
  }

  return sectionMap
}

/**
 * For each heading, find all descendant headings (deeper level until same/higher level).
 * Returns a map of headingId → array of descendant heading ids, and a set of parent ids.
 */
function buildDescendantsMap(headings) {
  const descendantsMap = new Map()
  const parentSet = new Set()

  for (let i = 0; i < headings.length; i++) {
    const descendants = []
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= headings[i].level) break
      descendants.push(headings[j].id)
    }
    if (descendants.length > 0) {
      descendantsMap.set(headings[i].id, descendants)
      parentSet.add(headings[i].id)
    }
  }

  return { descendantsMap, parentSet }
}

export function TableOfContents({ blocks, annotations = [], collapsed, width }) {
  const [activeId, setActiveId] = useState(null)
  const [collapsedIds, setCollapsedIds] = useState(() => new Set())
  const observerRef = useRef(null)
  const tocRef = useRef(null)

  const headings = useMemo(() => blocks.filter(b => b.type === 'heading'), [blocks])

  const sectionMap = useMemo(() => buildSectionMap(blocks), [blocks])

  const { descendantsMap, parentSet } = useMemo(
    () => buildDescendantsMap(headings),
    [headings]
  )

  // Heading IDs hidden because an ancestor is collapsed
  const hiddenIds = useMemo(() => {
    const hidden = new Set()
    for (const id of collapsedIds) {
      const descendants = descendantsMap.get(id)
      if (descendants) {
        for (const descId of descendants) {
          hidden.add(descId)
        }
      }
    }
    return hidden
  }, [collapsedIds, descendantsMap])

  const annotationCountPerHeading = useMemo(() => {
    if (annotations.length === 0) {
      return new Map()
    }
    const annotatedBlockIds = annotations.reduce((map, a) => {
      map.set(a.blockId, (map.get(a.blockId) || 0) + 1)
      return map
    }, new Map())

    const counts = new Map()
    for (const [headingId, sectionBlockIds] of sectionMap) {
      let count = annotatedBlockIds.get(headingId) || 0
      for (const blockId of sectionBlockIds) {
        count += annotatedBlockIds.get(blockId) || 0
      }
      if (count > 0) {
        counts.set(headingId, count)
      }
    }
    return counts
  }, [sectionMap, annotations])

  // Deep counts: heading's own annotation count + all descendants' counts
  const deepAnnotationCounts = useMemo(() => {
    const deep = new Map()
    for (const [headingId, descendants] of descendantsMap) {
      let total = annotationCountPerHeading.get(headingId) || 0
      for (const descId of descendants) {
        total += annotationCountPerHeading.get(descId) || 0
      }
      if (total > 0) {
        deep.set(headingId, total)
      }
    }
    return deep
  }, [descendantsMap, annotationCountPerHeading])

  const toggleCollapse = useCallback((headingId, e) => {
    e.stopPropagation()
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(headingId)) {
        next.delete(headingId)
      } else {
        next.add(headingId)
      }
      return next
    })
  }, [])

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
    <nav className="toc-panel" ref={tocRef} style={width ? { width: `${width}px` } : undefined}>
      <div className="toc-header">
        <h2>Contents</h2>
      </div>
      <ul className="toc-list">
        {headings.map(h => {
          const isHidden = hiddenIds.has(h.id)
          const isParent = parentSet.has(h.id)
          const isCollapsed = collapsedIds.has(h.id)
          const count = isCollapsed
            ? (deepAnnotationCounts.get(h.id) || 0)
            : (annotationCountPerHeading.get(h.id) || 0)

          return (
            <li key={h.id} className={`toc-li${isHidden ? ' toc-li--hidden' : ''}`}>
              <div className="toc-li-inner">
                <button
                  className={`toc-item toc-item--level-${h.level}${activeId === h.id ? ' toc-item--active' : ''}${count > 0 ? ' toc-item--annotated' : ''}`}
                  data-toc-id={h.id}
                  onClick={() => handleClick(h.id)}
                  aria-expanded={isParent ? !isCollapsed : undefined}
                  title={h.content}
                >
                  {isParent ? (
                    <span
                      className={`toc-toggle${isCollapsed ? '' : ' toc-toggle--expanded'}`}
                      onClick={(e) => toggleCollapse(h.id, e)}
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 16 16" width="10" height="10">
                        <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  ) : (
                    <span className="toc-toggle toc-toggle--placeholder" aria-hidden="true" />
                  )}
                  <span className="toc-item-text">{h.content}</span>
                  {count > 0 && (
                    <span className="toc-badge">{count}</span>
                  )}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
