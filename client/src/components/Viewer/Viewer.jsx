import { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react'
import Highlighter from 'web-highlighter'
import 'highlight.js/styles/github-dark.css'
import { Toolbar } from '../Toolbar.jsx'
import { MermaidBlock } from '../MermaidBlock.jsx'
import { BlockRenderer } from './BlockRenderer.jsx'
import { CodeBlock } from './CodeBlock.jsx'

const MD_LINK_PATTERN = /\.(?:md|markdown|mdown|mkd)(?:[#?]|$)/i

function removeInsertionMarker(el) {
  const parent = el?.parentNode
  if (parent) {
    parent.removeChild(el)
    parent.normalize()
  }
}

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
      // Skip element/global/insertion annotations — they have no web-highlighter DOM
      if (ann.targetType === 'image' || ann.targetType === 'diagram' || ann.targetType === 'global' || ann.type === 'INSERTION') {return true}
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
      // Route element annotations to the element-specific method
      if (ann.targetType === 'image' || ann.targetType === 'diagram') {
        this.openElementEditToolbar(ann)
        return
      }
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
    },
    openElementEditToolbar(ann) {
      let targetEl = null
      if (ann.targetType === 'image') {
        targetEl = containerRef.current?.querySelector(
          `[data-block-id="${ann.blockId}"] .annotatable-image-wrapper[data-image-src="${CSS.escape(ann.imageSrc)}"]`
        )
      } else if (ann.targetType === 'diagram') {
        targetEl = containerRef.current?.querySelector(
          `[data-block-id="${ann.blockId}"] .mermaid-diagram`
        ) || containerRef.current?.querySelector(`[data-block-id="${ann.blockId}"]`)
      }
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => {
          setToolbarState({ element: targetEl, annotation: ann, mode: 'edit', elementMode: true })
        }, 300)
      }
    }
  }))

  useEffect(() => {
    if (!containerRef.current) {return}

    const highlighter = new Highlighter({
      $root: containerRef.current,
      exceptSelectors: ['.annotation-toolbar', 'button', '.code-copy-btn', '.annotatable-image-wrapper', '.mermaid-diagram', '.mermaid-controls'],
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
          // Clean up any active insertion marker
          if (toolbarStateRef.current?.insertionMode) {
            removeInsertionMarker(toolbarStateRef.current.element)
          }
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
      // Clean up any active insertion marker
      if (current?.insertionMode) {
        removeInsertionMarker(current.element)
      }
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

    // Insertion mode: detect zero-width cursor placement
    const handleCursorClick = (e) => {
      // Don't interfere with active toolbar or pending highlight
      if (toolbarStateRef.current) {return}
      if (pendingSourceRef.current) {return}
      if (isRestoringRef.current) {return}

      // Ignore clicks on toolbar, buttons, code blocks, images, diagrams
      if (e.target.closest('.annotation-toolbar, button, .code-copy-btn, .annotatable-image-wrapper, .mermaid-diagram, .mermaid-controls')) {return}

      requestAnimationFrame(() => {
        // If web-highlighter created a pending source in the meantime, don't interfere
        if (pendingSourceRef.current || toolbarStateRef.current) {return}

        const sel = window.getSelection()
        if (!sel || !sel.isCollapsed || sel.rangeCount === 0) {return}

        const range = sel.getRangeAt(0)

        // Find containing block
        let blockEl = range.startContainer
        if (blockEl.nodeType === Node.TEXT_NODE) {blockEl = blockEl.parentElement}
        while (blockEl && !blockEl.dataset?.blockId) {
          blockEl = blockEl.parentElement
        }
        if (!blockEl || !containerRef.current.contains(blockEl)) {return}

        // Don't trigger on existing highlights
        if (range.startContainer.parentElement?.closest('[data-highlight-id]')) {return}

        const blockId = blockEl.dataset.blockId
        const blockText = blockEl.textContent || ''

        // Calculate character offset
        const preRange = document.createRange()
        preRange.selectNodeContents(blockEl)
        preRange.setEnd(range.startContainer, range.startOffset)
        const offset = preRange.toString().length

        // Get context (~50 chars before cursor)
        const afterContext = blockText.slice(Math.max(0, offset - 50), offset)

        // Create a temporary zero-width marker for toolbar positioning
        const marker = document.createElement('span')
        marker.className = 'insertion-marker-temp'
        marker.textContent = '\u200B' // zero-width space
        range.insertNode(marker)

        setToolbarState({
          element: marker,
          insertionMode: true,
          insertionData: { blockId, offset, afterContext }
        })
      })
    }

    const container = containerRef.current
    container.addEventListener('click', handleCursorClick)

    return () => {
      // Clean up any lingering insertion markers
      container?.querySelectorAll('.insertion-marker-temp').forEach(removeInsertionMarker)
      container?.removeEventListener('click', handleCursorClick)
      highlighter.dispose()
    }
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
    if (!toolbarState) {return}

    // Insertion annotations bypass web-highlighter
    if (toolbarState.insertionMode) {
      const { blockId, offset, afterContext } = toolbarState.insertionData
      const newAnnotation = {
        id: crypto.randomUUID(),
        blockId,
        startOffset: offset,
        endOffset: offset,
        type: 'INSERTION',
        text: text || '',
        afterContext,
        originalText: '',
        createdAt: Date.now(),
        startMeta: null,
        endMeta: null
      }
      // Remove temporary marker and normalize DOM
      removeInsertionMarker(toolbarState.element)
      onAddAnnotationRef.current(newAnnotation)
      setToolbarState(null)
      setRequestedToolbarStep(null)
      window.getSelection()?.removeAllRanges()
      return
    }

    // Element annotations (image/diagram) bypass web-highlighter
    if (toolbarState.elementMode) {
      if (toolbarState.mode === 'edit') {
        onEditAnnotationRef.current(toolbarState.annotation.id, type, text)
      } else {
        const { elementData } = toolbarState
        const newAnnotation = {
          id: crypto.randomUUID(),
          blockId: elementData.blockId,
          startOffset: 0,
          endOffset: 0,
          type,
          targetType: elementData.targetType,
          text: text || null,
          originalText: elementData.originalText,
          createdAt: Date.now(),
          startMeta: null,
          endMeta: null,
          imageAlt: elementData.imageAlt,
          imageSrc: elementData.imageSrc
        }
        onAddAnnotationRef.current(newAnnotation)
      }
      setToolbarState(null)
      setRequestedToolbarStep(null)
      return
    }

    const highlighter = highlighterRef.current
    if (!highlighter) {return}

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
    // Clean up insertion marker and normalize DOM
    if (toolbarState?.insertionMode) {
      removeInsertionMarker(toolbarState.element)
    } else if (!toolbarState?.elementMode && toolbarState?.mode !== 'edit' && toolbarState?.source && highlighterRef.current) {
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

  // Computed sets for annotated elements
  const annotatedImages = useMemo(() => {
    const map = new Map()
    annotations.filter(a => a.targetType === 'image').forEach(a => { map.set(`${a.blockId}::${a.imageSrc}`, a.type) })
    return map
  }, [annotations])

  const annotatedDiagramBlocks = useMemo(() => {
    const map = new Map()
    annotations.filter(a => a.targetType === 'diagram').forEach(a => { map.set(a.blockId, a.type) })
    return map
  }, [annotations])

  const handleImageClick = useCallback(({ alt, src, blockId, element }) => {
    // Close any pending text highlight
    if (pendingSourceRef.current && highlighterRef.current) {
      highlighterRef.current.remove(pendingSourceRef.current.id)
      pendingSourceRef.current = null
    }

    // Check for existing annotation on this image
    const existing = annotationsRef.current.find(
      a => a.targetType === 'image' && a.blockId === blockId && a.imageSrc === src
    )
    if (existing) {
      onSelectAnnotation(existing.id)
      setToolbarState({ element, annotation: existing, mode: 'edit', elementMode: true })
      setRequestedToolbarStep(null)
    } else {
      setToolbarState({
        element,
        elementMode: true,
        elementData: {
          targetType: 'image',
          blockId,
          imageAlt: alt,
          imageSrc: src,
          originalText: `![${alt}](${src})`
        }
      })
      setRequestedToolbarStep(null)
    }
  }, [onSelectAnnotation])

  const handleDiagramClick = useCallback(({ blockId, element, content }) => {
    // Close any pending text highlight
    if (pendingSourceRef.current && highlighterRef.current) {
      highlighterRef.current.remove(pendingSourceRef.current.id)
      pendingSourceRef.current = null
    }

    // Check for existing annotation on this diagram
    const existing = annotationsRef.current.find(
      a => a.targetType === 'diagram' && a.blockId === blockId
    )
    if (existing) {
      onSelectAnnotation(existing.id)
      setToolbarState({ element, annotation: existing, mode: 'edit', elementMode: true })
      setRequestedToolbarStep(null)
    } else {
      setToolbarState({
        element,
        elementMode: true,
        elementData: {
          targetType: 'diagram',
          blockId,
          originalText: content
        }
      })
      setRequestedToolbarStep(null)
    }
  }, [onSelectAnnotation])

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
            <MermaidBlock
              key={block.id}
              block={block}
              onDiagramClick={handleDiagramClick}
              annotationType={annotatedDiagramBlocks.get(block.id) || null}
            />
          ) : block.type === 'code' ? (
            <CodeBlock key={block.id} block={block} />
          ) : (
            <BlockRenderer
              key={block.id}
              block={block}
              onImageClick={handleImageClick}
              annotatedImages={annotatedImages}
            />
          )
        )}
        <Toolbar
          highlightElement={toolbarState?.element ?? null}
          onAnnotate={handleAnnotate}
          onClose={handleToolbarClose}
          onDelete={handleToolbarDelete}
          requestedStep={requestedToolbarStep}
          editAnnotation={toolbarState?.mode === 'edit' ? toolbarState.annotation : null}
          elementMode={toolbarState?.elementMode || false}
          insertionMode={toolbarState?.insertionMode || false}
        />
      </article>
    </div>
  )
})
