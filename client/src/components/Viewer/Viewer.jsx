import { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import Highlighter from 'web-highlighter'
import 'highlight.js/styles/github-dark.css'
import { Toolbar } from '../Toolbar.jsx'
import { MermaidBlock } from '../MermaidBlock.jsx'
import { BlockRenderer } from './BlockRenderer.jsx'
import { CodeBlock } from './CodeBlock.jsx'

const MD_LINK_PATTERN = /\.(?:md|markdown|mdown|mkd)(?:[#?]|$)/i

export const Viewer = forwardRef(function Viewer({
  blocks,
  annotations,
  onAddAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  onSelectAnnotation,
  onOpenFile,
  selectedAnnotationId: _selectedAnnotationId
}, ref) {
  const containerRef = useRef(null)
  const highlighterRef = useRef(null)
  const onAddAnnotationRef = useRef(onAddAnnotation)
  const onEditAnnotationRef = useRef(onEditAnnotation)
  const annotationsRef = useRef(annotations)
  const toolbarStateRef = useRef(null)
  const pendingSourceRef = useRef(null)
  const isRestoringRef = useRef(false)
  const [toolbarState, setToolbarState] = useState(null)
  const [requestedToolbarStep, setRequestedToolbarStep] = useState(null)

  useEffect(() => { onAddAnnotationRef.current = onAddAnnotation }, [onAddAnnotation])
  useEffect(() => { onEditAnnotationRef.current = onEditAnnotation }, [onEditAnnotation])
  useEffect(() => { annotationsRef.current = annotations }, [annotations])
  useEffect(() => { toolbarStateRef.current = toolbarState }, [toolbarState])

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
      const manualHighlights = containerRef.current?.querySelectorAll(`[data-highlight-id="${id}"]`)
      manualHighlights?.forEach(el => {
        const parent = el.parentNode
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el)
        }
        el.remove()
      })
    },
    restoreHighlight(ann) {
      const highlighter = highlighterRef.current
      if (!highlighter) {return false}
      const wasRestoring = isRestoringRef.current
      isRestoringRef.current = true
      try {
        highlighter.fromStore(ann.startMeta, ann.endMeta, ann.originalText, ann.id)
        highlighter.addClass(ann.type.toLowerCase(), ann.id)
        return true
      } catch (_e) {
        return false
      } finally {
        isRestoringRef.current = wasRestoring
      }
    },
    restoreHighlights(anns) {
      if (!highlighterRef.current) {return}
      anns.forEach(ann => { this.restoreHighlight(ann) })
    },
    clearAllHighlights() {
      const highlighter = highlighterRef.current
      if (highlighter) {
        highlighter.removeAll()
      }
      // Fallback: clean any orphaned DOM elements
      const allHighlights = containerRef.current?.querySelectorAll('.annotation-highlight, [data-highlight-id]')
      allHighlights?.forEach(el => {
        const parent = el.parentNode
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el)
        }
        el.remove()
      })
    },
    updateHighlightType(id, type) {
      const highlighter = highlighterRef.current
      if (!highlighter) {return}
      highlighter.removeClass('deletion', id)
      highlighter.removeClass('comment', id)
      highlighter.addClass(type.toLowerCase(), id)
    },
    openEditToolbar(ann) {
      const highlighter = highlighterRef.current
      if (!highlighter) {return}
      if (pendingSourceRef.current) {
        highlighter.remove(pendingSourceRef.current.id)
        pendingSourceRef.current = null
      }
      const doms = highlighter.getDoms(ann.id)
      if (doms?.length > 0) {
        doms[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => {
          setToolbarState({ element: doms[0], annotation: ann, mode: 'edit' })
        }, 300)
      }
    }
  }))

  useEffect(() => {
    if (!containerRef.current) {return}

    const highlighter = new Highlighter({
      $root: containerRef.current,
      exceptSelectors: ['.annotation-toolbar', 'button', '.code-copy-btn'],
      wrapTag: 'mark',
      style: { className: 'annotation-highlight' }
    })

    highlighterRef.current = highlighter

    highlighter.on(Highlighter.event.CREATE, ({ sources }) => {
      if (isRestoringRef.current) {return}
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
      const current = toolbarStateRef.current
      if (current?.mode === 'edit' && current?.annotation?.id === id) {
        setToolbarState(null)
        setRequestedToolbarStep(null)
        return
      }
      if (pendingSourceRef.current) {
        highlighter.remove(pendingSourceRef.current.id)
        pendingSourceRef.current = null
      }
      const ann = annotationsRef.current.find(a => a.id === id)
      if (!ann) {return}
      onSelectAnnotation(id)
      const doms = highlighter.getDoms(id)
      if (doms?.length > 0) {
        setToolbarState({ element: doms[0], annotation: ann, mode: 'edit' })
        setRequestedToolbarStep(null)
      }
    })

    highlighter.run()

    return () => highlighter.dispose()
  }, [onSelectAnnotation])

  useEffect(() => {
    const highlighter = highlighterRef.current
    if (!highlighter) {return}

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
      } catch (_e) {
        // ignore
      }
    })
  }, [annotations])

  const handleAnnotate = useCallback((type, text) => {
    const highlighter = highlighterRef.current
    if (!toolbarState || !highlighter) {return}

    if (toolbarState.mode === 'edit') {
      const { annotation } = toolbarState
      highlighter.removeClass('deletion', annotation.id)
      highlighter.removeClass('comment', annotation.id)
      highlighter.addClass(type.toLowerCase(), annotation.id)
      onEditAnnotationRef.current(annotation.id, type, text)
    } else {
      createAnnotationFromSource(highlighter, toolbarState.source, type, text)
      pendingSourceRef.current = null
    }

    setToolbarState(null)
    setRequestedToolbarStep(null)
    window.getSelection()?.removeAllRanges()
  }, [toolbarState])

  const handleToolbarClose = useCallback(() => {
    if (toolbarState?.mode !== 'edit' && toolbarState && highlighterRef.current) {
      highlighterRef.current.remove(toolbarState.source.id)
    }
    pendingSourceRef.current = null
    setToolbarState(null)
    setRequestedToolbarStep(null)
    window.getSelection()?.removeAllRanges()
  }, [toolbarState])

  const handleToolbarDelete = useCallback((id) => {
    onDeleteAnnotation(id)
    setToolbarState(null)
    setRequestedToolbarStep(null)
  }, [onDeleteAnnotation])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'textarea' || tag === 'input') {return}

      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key === 'd' && toolbarState) {
        e.preventDefault()
        handleAnnotate('DELETION')
      }

      if (isMod && e.key === 'k' && toolbarState) {
        e.preventDefault()
        setRequestedToolbarStep(prev => (prev ?? 0) + 1)
      }

      if (e.key === 'Escape' && toolbarState) {
        e.preventDefault()
        handleToolbarClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toolbarState, handleAnnotate, handleToolbarClose])

  const handleLinkClick = useCallback((e) => {
    const anchor = e.target.closest('a[href]')
    if (!anchor) {return}
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://')) {return}
    if (!MD_LINK_PATTERN.test(href)) {return}
    e.preventDefault()
    onOpenFile?.(href)
  }, [onOpenFile])

  return (
    <div className="viewer-container">
      <article ref={containerRef} className="viewer-article" onClick={handleLinkClick}>
        {blocks.map(block =>
          block.type === 'code' && block.language === 'mermaid' ? (
            <MermaidBlock key={block.id} block={block} />
          ) : block.type === 'code' ? (
            <CodeBlock key={block.id} block={block} />
          ) : (
            <BlockRenderer key={block.id} block={block} />
          )
        )}
        <Toolbar
          highlightElement={toolbarState?.element ?? null}
          onAnnotate={handleAnnotate}
          onClose={handleToolbarClose}
          onDelete={handleToolbarDelete}
          requestedStep={requestedToolbarStep}
          editAnnotation={toolbarState?.mode === 'edit' ? toolbarState.annotation : null}
        />
      </article>
    </div>
  )
})
