function handleAnchorClick(e, href) {
  if (!href.startsWith('#') || href.length === 1) { return }
  const viewerEl = e.target.closest('.viewer-container')
  if (!viewerEl) { return }
  const targetEl = document.getElementById(href.slice(1))
  if (targetEl && viewerEl.contains(targetEl)) {
    e.preventDefault()
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export function InlineMarkdown({ text }) {
  const parts = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    let match = remaining.match(/^\*\*(.+?)\*\*/)
    if (match) {
      parts.push(<strong key={key++}>{match[1]}</strong>)
      remaining = remaining.slice(match[0].length)
      continue
    }

    match = remaining.match(/^\*(.+?)\*/)
    if (match) {
      parts.push(<em key={key++}>{match[1]}</em>)
      remaining = remaining.slice(match[0].length)
      continue
    }

    match = remaining.match(/^`([^`]+)`/)
    if (match) {
      parts.push(<code key={key++} className="inline-code">{match[1]}</code>)
      remaining = remaining.slice(match[0].length)
      continue
    }

    // Images: ![alt](url)
    match = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
    if (match) {
      parts.push(
        <img key={key++} src={match[2]} alt={match[1]} className="inline-image" />
      )
      remaining = remaining.slice(match[0].length)
      continue
    }

    // Links: [text](url)
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (match) {
      const href = match[2]
      const isAnchor = href.startsWith('#')
      const isExternal = href.startsWith('http://') || href.startsWith('https://')
      if (isAnchor) {
        parts.push(<a key={key++} href={href} onClick={(e) => handleAnchorClick(e, href)}>{match[1]}</a>)
      } else if (isExternal) {
        parts.push(
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="external-link">
            {match[1]}
            <svg className="external-link-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )
      } else {
        parts.push(<a key={key++} href={href} target="_blank" rel="noopener noreferrer">{match[1]}</a>)
      }
      remaining = remaining.slice(match[0].length)
      continue
    }

    const nextSpecial = remaining.slice(1).search(/[*`![]/)
    if (nextSpecial === -1) {
      parts.push(remaining)
      break
    } else {
      parts.push(remaining.slice(0, nextSpecial + 1))
      remaining = remaining.slice(nextSpecial + 1)
    }
  }

  return <>{parts}</>
}
