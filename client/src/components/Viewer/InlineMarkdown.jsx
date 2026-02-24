function handleAnchorClick(e, href) {
  const viewerEl = e.target.closest('.viewer-container')
  const targetEl = viewerEl?.querySelector(href)
  if (targetEl) {
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
      parts.push(
        isAnchor
          ? <a key={key++} href={href} onClick={(e) => handleAnchorClick(e, href)}>{match[1]}</a>
          : <a key={key++} href={href} target="_blank" rel="noopener noreferrer">{match[1]}</a>
      )
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
