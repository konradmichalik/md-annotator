import { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import Highlighter from 'web-highlighter'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { Toolbar } from './Toolbar.jsx'

/**
 * Renders inline markdown: **bold**, *italic*, `code`, [links](url)
 */
function InlineMarkdown({ text }) {
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

    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (match) {
      parts.push(
        <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer">
          {match[1]}
        </a>
      )
      remaining = remaining.slice(match[0].length)
      continue
    }

    const nextSpecial = remaining.slice(1).search(/[*`[]/)
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

function parseTableContent(content) {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line) =>
    line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())

  const headers = parseRow(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (/^[|\-:\s]+$/.test(line)) continue
    rows.push(parseRow(line))
  }

  return { headers, rows }
}

function BlockRenderer({ block }) {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level || 1}`
      return <Tag className={`heading heading-${block.level || 1}`} data-block-id={block.id}><InlineMarkdown text={block.content} /></Tag>
    }

    case 'blockquote':
      return (
        <blockquote className="block-blockquote" data-block-id={block.id}>
          <InlineMarkdown text={block.content} />
        </blockquote>
      )

    case 'list-item': {
      const indent = (block.level || 0) * 1.25
      const isCheckbox = block.checked !== undefined
      const bullets = ['•', '◦', '▪']
      const bullet = bullets[Math.min(block.level || 0, 2)]
      return (
        <div className="block-list-item" data-block-id={block.id} style={{ marginLeft: `${indent}rem` }}>
          <span className="list-marker">
            {isCheckbox
              ? (block.checked ? '☑' : '☐')
              : bullet}
          </span>
          <span className={isCheckbox && block.checked ? 'checked-text' : ''}>
            <InlineMarkdown text={block.content} />
          </span>
        </div>
      )
    }

    case 'table': {
      const { headers, rows } = parseTableContent(block.content)
      return (
        <div className="block-table-wrapper" data-block-id={block.id}>
          <table className="block-table">
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <th key={i}><InlineMarkdown text={header} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}><InlineMarkdown text={cell} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'hr':
      return <hr className="block-hr" data-block-id={block.id} />

    default:
      return (
        <p className="block-paragraph" data-block-id={block.id}>
          <InlineMarkdown text={block.content} />
        </p>
      )
  }
}

function CodeBlock({ block, onHover, onLeave, isHovered }) {
  const [copied, setCopied] = useState(false)
  const containerRef = useRef(null)
  const codeRef = useRef(null)

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted')
      codeRef.current.className = `hljs${block.language ? ` language-${block.language}` : ''}`
      hljs.highlightElement(codeRef.current)
    }
  }, [block.content, block.language])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(block.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
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
        {copied ? '✓' : '⎘'}
      </button>
      <pre className="block-code">
        <code ref={codeRef} className={`hljs${block.language ? ` language-${block.language}` : ''}`}>
          {block.content}
        </code>
      </pre>
    </div>
  )
}

export const Viewer = forwardRef(function Viewer({
  blocks,
  annotations,
  onAddAnnotation,
  onSelectAnnotation,
  selectedAnnotationId
}, ref) {
  const containerRef = useRef(null)
  const highlighterRef = useRef(null)
  const onAddAnnotationRef = useRef(onAddAnnotation)
  const pendingSourceRef = useRef(null)
  const [toolbarState, setToolbarState] = useState(null)

  useEffect(() => {
    onAddAnnotationRef.current = onAddAnnotation
  }, [onAddAnnotation])

  const createAnnotationFromSource = (highlighter, source, type, text) => {
    const doms = highlighter.getDoms(source.id)
    let blockId = ''
    let startOffset = 0

    if (doms?.length > 0) {
      const el = doms[0]
      let parent = el.parentElement
      while (parent && !parent.dataset.blockId) {
        parent = parent.parentElement
      }
      if (parent?.dataset.blockId) {
        blockId = parent.dataset.blockId
        const blockText = parent.textContent || ''
        const beforeText = blockText.split(source.text)[0]
        startOffset = beforeText?.length || 0
      }
    }

    const newAnnotation = {
      id: source.id,
      blockId,
      startOffset,
      endOffset: startOffset + source.text.length,
      type,
      text: text || null,
      originalText: source.text,
      createdAt: Date.now(),
      startMeta: source.startMeta,
      endMeta: source.endMeta
    }

    if (type === 'DELETION') {
      highlighter.addClass('deletion', source.id)
    } else if (type === 'COMMENT') {
      highlighter.addClass('comment', source.id)
    }

    onAddAnnotationRef.current(newAnnotation)
  }

  useImperativeHandle(ref, () => ({
    removeHighlight(id) {
      highlighterRef.current?.remove(id)
      const manualHighlights = containerRef.current?.querySelectorAll(`[data-bind-id="${id}"]`)
      manualHighlights?.forEach(el => {
        const parent = el.parentNode
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el)
        }
        el.remove()
      })
    },
    clearAllHighlights() {
      const allHighlights = containerRef.current?.querySelectorAll('.annotation-highlight, [data-bind-id]')
      allHighlights?.forEach(el => {
        const parent = el.parentNode
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el)
        }
        el.remove()
      })
    }
  }))

  useEffect(() => {
    if (!containerRef.current) return

    const highlighter = new Highlighter({
      $root: containerRef.current,
      exceptSelectors: ['.annotation-toolbar', 'button', '.code-copy-btn'],
      wrapTag: 'mark',
      style: { className: 'annotation-highlight' }
    })

    highlighterRef.current = highlighter

    highlighter.on(Highlighter.event.CREATE, ({ sources }) => {
      if (sources.length > 0) {
        const source = sources[0]
        const doms = highlighter.getDoms(source.id)
        if (doms?.length > 0) {
          if (pendingSourceRef.current) {
            highlighter.remove(pendingSourceRef.current.id)
            pendingSourceRef.current = null
          }
          pendingSourceRef.current = source
          setToolbarState({ element: doms[0], source })
        }
      }
    })

    highlighter.on(Highlighter.event.CLICK, ({ id }) => {
      onSelectAnnotation(id)
    })

    highlighter.run()

    return () => highlighter.dispose()
  }, [onSelectAnnotation])

  useEffect(() => {
    const highlighter = highlighterRef.current
    if (!highlighter) return

    annotations.forEach(ann => {
      try {
        const doms = highlighter.getDoms(ann.id)
        if (doms?.length > 0) {
          if (ann.type === 'DELETION') {
            highlighter.addClass('deletion', ann.id)
          } else if (ann.type === 'COMMENT') {
            highlighter.addClass('comment', ann.id)
          }
        }
      } catch (e) {
        // ignore
      }
    })
  }, [annotations])

  const handleAnnotate = (type, text) => {
    const highlighter = highlighterRef.current
    if (!toolbarState || !highlighter) return
    createAnnotationFromSource(highlighter, toolbarState.source, type, text)
    pendingSourceRef.current = null
    setToolbarState(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleToolbarClose = () => {
    if (toolbarState && highlighterRef.current) {
      highlighterRef.current.remove(toolbarState.source.id)
    }
    pendingSourceRef.current = null
    setToolbarState(null)
    window.getSelection()?.removeAllRanges()
  }

  return (
    <div className="viewer-container">
      <article ref={containerRef} className="viewer-article">
        {blocks.map(block =>
          block.type === 'code' ? (
            <CodeBlock key={block.id} block={block} />
          ) : (
            <BlockRenderer key={block.id} block={block} />
          )
        )}
        <Toolbar
          highlightElement={toolbarState?.element ?? null}
          onAnnotate={handleAnnotate}
          onClose={handleToolbarClose}
        />
      </article>
    </div>
  )
})
