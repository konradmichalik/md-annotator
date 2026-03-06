import { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react'
import Highlighter from 'web-highlighter'
import 'highlight.js/styles/github-dark.css'
import { Toolbar } from '../Toolbar.jsx'
import { MermaidBlock } from '../MermaidBlock.jsx'
import { PinpointOverlay } from '../PinpointOverlay.jsx'
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

function createPersistentInsertionMarker(id, blockEl, offset) {
  const marker = document.createElement('span')
  marker.className = 'insertion-marker'
  marker.dataset.highlightId = id
  marker.dataset.insertionId = id
  marker.textContent = '\u200B'

  const range = document.createRange()
  const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT)
  let charCount = 0
  let placed = false

  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.parentElement?.closest('.insertion-marker')) { continue }
    const len = node.textContent.length
    if (charCount + len >= offset) {
      range.setStart(node, offset - charCount)
      range.collapse(true)
      range.insertNode(marker)
      placed = true
      break
    }
    charCount += len
  }

  if (!placed) {
    blockEl.appendChild(marker)
  }

  return marker
}

export const Viewer = forwardRef(function Viewer({
  blocks,
  annotations,
  onAddAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  onSelectAnnotation,
  onOpenFile,
  pinpointMode,
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
  const [pinpointTarget, setPinpointTarget] = useState(null)

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
        // Use DOM Range to calculate exact offset (handles duplicate text correctly)
        const range = document.createRange()
        range.selectNodeContents(parent)
        range.setEnd(el, 0)
        startOffset = range.toString().length
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
      if (ann.type === 'INSERTION') {
        const blockEl = containerRef.current?.querySelector(`[data-block-id="${ann.blockId}"]`)
        if (!blockEl) {return false}
        const existing = blockEl.querySelector(`[data-insertion-id="${ann.id}"]`)
        if (!existing) {
          createPersistentInsertionMarker(ann.id, blockEl, ann.startOffset)
        }
        return true
      }
      if (ann.targetType === 'image' || ann.targetType === 'diagram' || ann.targetType === 'pinpoint' || ann.targetType === 'global' || ann.type === 'NOTES') {return true}
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
      if (ann.targetType === 'image' || ann.targetType === 'diagram' || ann.targetType === 'pinpoint') {
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
      } else if (ann.targetType === 'pinpoint') {
        targetEl = containerRef.current?.querySelector(`[data-block-id="${ann.blockId}"]`)
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

      // Find all annotations overlapping this click point via DOM ancestry
      const clickedDom = highlighter.getDoms(id)?.[0]
      const overlappingIds = new Set()
      let node = clickedDom
      while (node && !node.dataset?.blockId) {
        if (node.dataset?.highlightId) { overlappingIds.add(node.dataset.highlightId) }
        node = node.parentElement
      }
      const overlapping = annotationsRef.current.filter(a => overlappingIds.has(a.id))

      // Cycle through overlapping annotations on repeated clicks
      let targetAnn
      if (overlapping.length > 1 && current?.mode === 'edit' && overlapping.some(a => a.id === current.annotation?.id)) {
        const currentIdx = overlapping.findIndex(a => a.id === current.annotation.id)
        targetAnn = overlapping[(currentIdx + 1) % overlapping.length]
      } else {
        targetAnn = annotationsRef.current.find(a => a.id === id)
      }

      if (!targetAnn) {return}

      if (current?.mode === 'edit' && current?.annotation?.id === targetAnn.id) {
        setToolbarState(null)
        setRequestedToolbarStep(null)
        return
      }
      if (pendingSourceRef.current) {
        highlighter.remove(pendingSourceRef.current.id)
        pendingSourceRef.current = null
      }
      onSelectAnnotation(targetAnn.id)
      // NOTES are read-only — select but don't open edit toolbar
      if (targetAnn.type === 'NOTES') {return}
      const targetDoms = highlighter.getDoms(targetAnn.id)
      if (targetDoms?.length > 0) {
        setToolbarState({ element: targetDoms[0], annotation: targetAnn, mode: 'edit' })
        setRequestedToolbarStep(null)
      }
    })

    highlighter.run()

    // Insertion mode: Alt+Click to insert text at cursor position
    const handleCursorClick = (e) => {
      // Only trigger on Alt+Click
      if (!e.altKey) {return}
      // Don't interfere with active toolbar or pending highlight
      if (toolbarStateRef.current) {return}
      if (pendingSourceRef.current) {return}
      if (isRestoringRef.current) {return}

      // Ignore clicks on interactive/UI targets and links
      if (e.defaultPrevented) {return}
      if (e.target.closest('.annotation-toolbar, button, a[href], .code-copy-btn, .annotatable-image-wrapper, .mermaid-diagram, .mermaid-controls, .block-note-border, .insertion-marker')) {return}

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

    const handleInsertionMarkerClick = (e) => {
      const marker = e.target.closest('.insertion-marker[data-insertion-id]')
      if (!marker) {return}
      e.stopPropagation()
      const annId = marker.dataset.insertionId
      const ann = annotationsRef.current.find(a => a.id === annId)
      if (!ann) {return}
      onSelectAnnotation(annId)
      setToolbarState({ element: marker, annotation: ann, mode: 'edit', insertionEdit: true })
      setRequestedToolbarStep(null)
    }

    const container = containerRef.current
    container.addEventListener('click', handleCursorClick)
    container.addEventListener('click', handleInsertionMarkerClick)

    return () => {
      container?.querySelectorAll('.insertion-marker-temp').forEach(removeInsertionMarker)
      container?.removeEventListener('click', handleCursorClick)
      container?.removeEventListener('click', handleInsertionMarkerClick)
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
      const insertionText = typeof text === 'string' ? text.trim() : ''
      removeInsertionMarker(toolbarState.element)
      if (!insertionText) {
        setToolbarState(null)
        setRequestedToolbarStep(null)
        window.getSelection()?.removeAllRanges()
        return
      }
      const { blockId, offset, afterContext } = toolbarState.insertionData
      const annId = crypto.randomUUID()
      const newAnnotation = {
        id: annId,
        blockId,
        startOffset: offset,
        endOffset: offset,
        type: 'INSERTION',
        text: insertionText,
        afterContext,
        originalText: '',
        createdAt: Date.now(),
        startMeta: null,
        endMeta: null
      }
      const blockEl = containerRef.current?.querySelector(`[data-block-id="${blockId}"]`)
      if (blockEl) {
        createPersistentInsertionMarker(annId, blockEl, offset)
      }
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

  const annotatedPinpointBlocks = useMemo(() => {
    const map = new Map()
    annotations.filter(a => a.targetType === 'pinpoint').forEach(a => { map.set(a.blockId, a.type) })
    return map
  }, [annotations])

  // Apply persistent pinpoint highlighting via CSS classes
  useEffect(() => {
    if (!containerRef.current) {return}
    const blockEls = containerRef.current.querySelectorAll('[data-block-id]')
    blockEls.forEach(el => {
      const blockId = el.dataset.blockId
      const type = annotatedPinpointBlocks.get(blockId)
      el.classList.toggle('pinpoint-annotated', !!type)
      el.classList.toggle('pinpoint-deletion', type === 'DELETION')
      el.classList.toggle('pinpoint-comment', type === 'COMMENT')
    })
  }, [annotatedPinpointBlocks])

  const noteBlockIds = useMemo(() => {
    const map = new Map()
    annotations.filter(a => a.type === 'NOTES' && a.blockId).forEach(a => {
      if (!map.has(a.blockId)) { map.set(a.blockId, a.id) }
    })
    return map
  }, [annotations])

  const handleNoteClick = useCallback((blockId) => {
    const annId = noteBlockIds.get(blockId)
    if (annId) { onSelectAnnotation(annId) }
  }, [noteBlockIds, onSelectAnnotation])

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
    // Click on pinpoint-annotated block → open edit toolbar
    const pinpointEl = e.target.closest('.pinpoint-annotated[data-block-id]')
    if (pinpointEl && containerRef.current?.contains(pinpointEl)) {
      const blockId = pinpointEl.dataset.blockId
      const existing = annotationsRef.current.find(
        a => a.blockId === blockId && a.targetType === 'pinpoint'
      )
      if (existing) {
        e.preventDefault()
        onSelectAnnotation(existing.id)
        setToolbarState({ element: pinpointEl, annotation: existing, mode: 'edit', elementMode: true })
        setRequestedToolbarStep(null)
        return
      }
    }

    const anchor = e.target.closest('a[href]')
    if (!anchor) {return}
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://')) {return}
    if (!MD_LINK_PATTERN.test(href)) {return}
    e.preventDefault()
    onOpenFile?.(href)
  }, [onOpenFile, onSelectAnnotation])

  const getBlockLabel = useCallback((blockEl) => {
    const blockId = blockEl.dataset.blockId
    const block = blocks.find(b => b.id === blockId)
    if (!block) {return 'Block'}
    if (block.type === 'heading') {return `Heading ${block.level}`}
    if (block.type === 'code') {return `Code${block.language ? ` (${block.language})` : ''}`}
    if (block.type === 'list-item') {return 'List item'}
    if (block.type === 'blockquote') {return 'Blockquote'}
    if (block.type === 'hr') {return 'Divider'}
    return 'Paragraph'
  }, [blocks])

  const handlePinpointClick = useCallback((e) => {
    if (!pinpointMode) {return}
    if (e.target.closest('.annotation-toolbar, .comment-popover, button, a[href], .code-copy-btn, .mermaid-controls')) {return}

    e.preventDefault()
    e.stopPropagation()

    let blockEl = e.target
    while (blockEl && !blockEl.dataset?.blockId) {
      blockEl = blockEl.parentElement
    }
    if (!blockEl || !containerRef.current?.contains(blockEl)) {return}

    const blockId = blockEl.dataset.blockId
    const blockText = blockEl.textContent || ''

    // Check for existing annotation on entire block (pinpoint type)
    const existing = annotationsRef.current.find(
      a => a.blockId === blockId && a.targetType === 'pinpoint'
    )

    if (existing) {
      onSelectAnnotation(existing.id)
      setToolbarState({ element: blockEl, annotation: existing, mode: 'edit', elementMode: true })
    } else {
      setToolbarState({
        element: blockEl,
        elementMode: true,
        elementData: {
          targetType: 'pinpoint',
          blockId,
          originalText: blockText.length > 200 ? blockText.slice(0, 200) + '...' : blockText
        }
      })
    }
    setRequestedToolbarStep(null)
    setPinpointTarget({ element: blockEl, label: getBlockLabel(blockEl) })
  }, [pinpointMode, onSelectAnnotation, getBlockLabel])

  // Clear pinpoint target when toolbar closes
  useEffect(() => {
    if (!toolbarState) {
      setPinpointTarget(null)
    }
  }, [toolbarState])

  return (
    <div className="viewer-container">
      <article
        ref={containerRef}
        className={`viewer-article${pinpointMode ? ' pinpoint-mode' : ''}`}
        onClick={pinpointMode ? handlePinpointClick : handleLinkClick}
      >
        {blocks.map(block =>
          block.type === 'code' && block.language === 'mermaid' ? (
            <MermaidBlock
              key={block.id}
              block={block}
              onDiagramClick={handleDiagramClick}
              annotationType={annotatedDiagramBlocks.get(block.id) || null}
              hasNote={noteBlockIds.has(block.id)}
              onNoteClick={handleNoteClick}
            />
          ) : block.type === 'code' ? (
            <CodeBlock key={block.id} block={block} hasNote={noteBlockIds.has(block.id)} onNoteClick={handleNoteClick} />
          ) : (
            <BlockRenderer
              key={block.id}
              block={block}
              onImageClick={handleImageClick}
              annotatedImages={annotatedImages}
              hasNote={noteBlockIds.has(block.id)}
              onNoteClick={handleNoteClick}
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
        {pinpointMode && <PinpointOverlay target={pinpointTarget} />}
      </article>
    </div>
  )
})
