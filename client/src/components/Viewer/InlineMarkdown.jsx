import DOMPurify from 'dompurify'

// Scheme allowlist. Anything else (javascript:, data:, vbscript:, file:, etc.) is rejected
// for <a href>. Schemeless / relative / fragment URLs always pass.
const SAFE_LINK_SCHEMES = /^(https?:|mailto:|tel:|#|\/|\.\.?\/|[^:]*$)/i

// Image sources additionally allow data:image/* (common legitimate inline images).
const SAFE_IMG_SCHEMES = /^(https?:|data:image\/|#|\/|\.\.?\/|[^:]*$)/i

// Strip control chars (e.g. "java\tscript:") before scheme check; they would otherwise
// let attackers slip past the allowlist in some parsers.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g

function isSafeLinkHref(href) {
  if (typeof href !== 'string') { return false }
  const stripped = href.replace(CONTROL_CHARS, '').trimStart()
  return SAFE_LINK_SCHEMES.test(stripped)
}

function isSafeImageSrc(src) {
  if (typeof src !== 'string') { return false }
  const stripped = src.replace(CONTROL_CHARS, '').trimStart()
  return SAFE_IMG_SCHEMES.test(stripped)
}

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

export function InlineMarkdown({ text, onImageClick, annotatedImages, blockId }) {
  const parts = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Hard line breaks: two+ trailing spaces or backslash before newline
    let match = remaining.match(/^(.*?)(?:  +|\\)\n/)
    if (match) {
      if (match[1]) {
        parts.push(<InlineMarkdown key={key++} text={match[1]} onImageClick={onImageClick} annotatedImages={annotatedImages} blockId={blockId} />)
      }
      parts.push(<br key={key++} />)
      remaining = remaining.slice(match[0].length)
      continue
    }

    match = remaining.match(/^\*\*(.+?)\*\*/)
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

    match = remaining.match(/^~~(.+?)~~/)
    if (match) {
      parts.push(<del key={key++}><InlineMarkdown text={match[1]} onImageClick={onImageClick} annotatedImages={annotatedImages} blockId={blockId} /></del>)
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
      const imgAlt = match[1]
      const imgSrc = match[2]
      // Unsafe image src (javascript:, non-image data:, etc.) → render alt text as plain string.
      if (!isSafeImageSrc(imgSrc)) {
        parts.push(imgAlt || '')
        remaining = remaining.slice(match[0].length)
        continue
      }
      const annotationType = annotatedImages?.get(`${blockId}::${imgSrc}`)
      const annClass = annotationType === 'DELETION' ? ' annotated-deletion' : annotationType ? ' annotated-comment' : ''
      parts.push(
        <span
          key={key++}
          className={`annotatable-image-wrapper${annClass}`}
          data-image-src={imgSrc}
          role="button"
          tabIndex={0}
          aria-label={imgAlt ? `Annotate image: ${imgAlt}` : 'Annotate image'}
          onClick={(e) => {
            e.stopPropagation()
            onImageClick?.({ alt: imgAlt, src: imgSrc, blockId, element: e.currentTarget })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onImageClick?.({ alt: imgAlt, src: imgSrc, blockId, element: e.currentTarget })
            }
          }}
        >
          <img src={imgSrc} alt={imgAlt} className="inline-image annotatable-image" />
        </span>
      )
      remaining = remaining.slice(match[0].length)
      continue
    }

    // Links: [text](url) — supports nested brackets for badge patterns like [![alt](img)](url)
    match = remaining.match(/^\[((?:[^[\]]|!?\[[^\]]*\]\([^)]*\))+)\]\(([^)]+)\)/)
    if (match) {
      const href = match[2]
      // Unsafe hrefs (javascript:, data:, vbscript:, …) → drop the <a> wrapper,
      // keep the link text so the document stays readable.
      if (!isSafeLinkHref(href)) {
        parts.push(<InlineMarkdown key={key++} text={match[1]} onImageClick={onImageClick} annotatedImages={annotatedImages} blockId={blockId} />)
        remaining = remaining.slice(match[0].length)
        continue
      }
      const isAnchor = href.startsWith('#')
      const isExternal = href.startsWith('http://') || href.startsWith('https://')
      // Badge pattern: [![alt](img)](url) — render as plain <a><img/></a> without annotation wrapper
      const badgeMatch = match[1].match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
      const badgeSrcSafe = badgeMatch && isSafeImageSrc(badgeMatch[2])
      const linkContent = badgeMatch && badgeSrcSafe
        ? <img src={badgeMatch[2]} alt={badgeMatch[1]} className="inline-image" />
        : badgeMatch
          ? <>{badgeMatch[1] || ''}</>
          : <InlineMarkdown text={match[1]} onImageClick={onImageClick} annotatedImages={annotatedImages} blockId={blockId} />
      if (isAnchor) {
        parts.push(<a key={key++} href={href} onClick={(e) => handleAnchorClick(e, href)}>{linkContent}</a>)
      } else if (isExternal) {
        parts.push(
          <a key={key++} href={href} data-href={href} onClick={(e) => e.preventDefault()} className="external-link">
            {linkContent}
            <svg className="external-link-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )
      } else {
        parts.push(<a key={key++} href={href} data-href={href} onClick={(e) => e.preventDefault()}>{linkContent}</a>)
      }
      remaining = remaining.slice(match[0].length)
      continue
    }

    // Inline HTML tags: <img>, <sup>, <sub>, <br>, <em>, <strong>, etc.
    match = remaining.match(/^<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+(?:="[^"]*")?)*)\s*\/?>/)
    if (match) {
      const htmlTag = match[0]
      const tagName = match[1].toLowerCase()
      // Self-closing or void tags — render directly
      if (htmlTag.endsWith('/>') || ['img', 'br', 'hr', 'input', 'wbr'].includes(tagName)) {
        parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlTag) }} />)
        remaining = remaining.slice(htmlTag.length)
        continue
      }
      // Paired inline tags like <sup>...</sup>
      const closeIdx = remaining.indexOf(`</${tagName}>`, htmlTag.length)
      if (closeIdx !== -1) {
        const fullTag = remaining.slice(0, closeIdx + tagName.length + 3)
        parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullTag) }} />)
        remaining = remaining.slice(fullTag.length)
        continue
      }
    }

    const nextSpecial = remaining.slice(1).search(/[*`![<~]/)
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
