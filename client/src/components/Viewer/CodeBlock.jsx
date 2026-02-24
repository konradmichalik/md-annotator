import { useState, useRef, useEffect, useCallback } from 'react'
import hljs from 'highlight.js'

export function CodeBlock({ block, onHover, onLeave, isHovered }) {
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

  return (
    <div
      ref={containerRef}
      className={`block-code-wrapper${isHovered ? ' hovered' : ''}`}
      data-block-id={block.id}
      onMouseEnter={() => onHover?.(containerRef.current)}
      onMouseLeave={() => onLeave?.()}
    >
      <button onClick={handleCopy} className="code-copy-btn" title={copied ? 'Copied!' : 'Copy code'}>
        {copied ? '\u2713' : '\u2398'}
      </button>
      <pre className="block-code">
        <code ref={codeRef} className={`hljs${block.language ? ` language-${block.language}` : ''}`}>
          {block.content}
        </code>
      </pre>
    </div>
  )
}
