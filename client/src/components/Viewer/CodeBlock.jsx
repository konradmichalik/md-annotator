import { useState, useRef, useEffect, useCallback } from 'react'
import hljs from 'highlight.js'

/**
 * Compute the character offset of a token span within the code block's text content.
 */
function getTokenOffset(codeEl, tokenSpan) {
  const range = document.createRange()
  range.selectNodeContents(codeEl)
  range.setEnd(tokenSpan, 0)
  return range.toString().length
}

export function CodeBlock({ block, onHover, onLeave, isHovered, hasNote, onNoteClick, onTokenSelect, selectedTokenId }) {
  const [copied, setCopied] = useState(false)
  const containerRef = useRef(null)
  const codeRef = useRef(null)
  const copyTimerRef = useRef(null)

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted')
      codeRef.current.className = `hljs${block.language ? ` language-${block.language}` : ''}`
      hljs.highlightElement(codeRef.current)
    }
  }, [block.content, block.language])

  useEffect(() => {
    return () => { if (copyTimerRef.current) { clearTimeout(copyTimerRef.current) } }
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(block.content)
      setCopied(true)
      if (copyTimerRef.current) { clearTimeout(copyTimerRef.current) }
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch (_err) {
      // ignore
    }
  }, [block.content])

  const handleCodeClick = useCallback((e) => {
    if (!onTokenSelect) { return }
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) { return }

    const span = e.target.closest('.hljs span')
    if (!span || !codeRef.current?.contains(span)) { return }

    e.stopPropagation()
    const tokenText = span.textContent
    if (!tokenText.trim()) { return }

    const charStart = getTokenOffset(codeRef.current, span)
    onTokenSelect({
      blockId: block.id,
      element: span,
      tokenText,
      charStart,
      charEnd: charStart + tokenText.length,
    })
  }, [onTokenSelect, block.id])

  return (
    <div
      ref={containerRef}
      className={`block-code-wrapper${isHovered ? ' hovered' : ''}${hasNote ? ' block-has-note' : ''}${selectedTokenId ? ' has-token-selection' : ''}`}
      data-block-id={block.id}
      onMouseEnter={() => onHover?.(containerRef.current)}
      onMouseLeave={() => onLeave?.()}
    >
      {hasNote && (
        <span
          className="block-note-border"
          onClick={(e) => { e.stopPropagation(); onNoteClick?.(block.id) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onNoteClick?.(block.id) } }}
          title="AI Note — click to view"
          role="button"
          tabIndex={0}
          aria-label="View AI note"
        />
      )}
      <div className="code-toolbar">
        {block.language && <span className="code-language-label">{block.language}</span>}
        <button
          onClick={handleCopy}
          className="code-copy-btn"
          title={copied ? 'Copied!' : 'Copy code'}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? '\u2713' : '\u2398'}
        </button>
      </div>
      <pre className="block-code token-selectable">
        <code
          ref={codeRef}
          className={`hljs${block.language ? ` language-${block.language}` : ''}`}
          onClick={handleCodeClick}
        >
          {block.content}
        </code>
      </pre>
    </div>
  )
}
