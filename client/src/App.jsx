/* global __APP_VERSION__ */
import { useState, useEffect, useRef, useCallback, useReducer } from 'react'
import { parseMarkdownToBlocks } from './utils/parser.js'
import { Viewer } from './components/Viewer/Viewer.jsx'
import { AnnotationPanel } from './components/AnnotationPanel.jsx'
import { TableOfContents } from './components/TableOfContents.jsx'
import { ExportModal } from './components/ExportModal.jsx'
import { validateAnnotationImport } from './utils/export.js'
import { getTextStats } from './utils/textStats.js'
import { UpdateBanner } from './components/UpdateBanner.jsx'
import { FileTabsBar } from './components/FileTabsBar.jsx'
import { initialAnnotationState } from './state/annotationReducer.js'
import { filesReducer } from './state/filesReducer.js'
import { useAutoClose } from './hooks/useAutoClose.js'
import { useResizablePanel } from './hooks/useResizablePanel.js'
import './styles.css'

// Theme: 'light' | 'dark' | 'auto'
function getInitialTheme() {
  const stored = localStorage.getItem('md-annotator-theme')
  return stored || 'auto'
}

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark' || theme === 'light') {
    root.setAttribute('data-theme', theme)
    return
  }
  // Auto: follow system preference
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  root.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
  const onChange = () => root.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getInitialSidebarCollapsed() {
  return localStorage.getItem('md-annotator-sidebar-collapsed') === 'true'
}

function getInitialTocCollapsed() {
  return localStorage.getItem('md-annotator-toc-collapsed') === 'true'
}

function FileStats({ content }) {
  const { lines, words, readingTime } = getTextStats(content)
  return (
    <span className="file-stats">
      {lines} lines &middot; {words} words &middot; ~{readingTime} min read
    </span>
  )
}

const ORIGIN_LABELS = {
  'claude-code': 'Claude Code',
  'opencode': 'OpenCode',
}

export default function App() {
  const [files, filesDispatch] = useReducer(filesReducer, [])
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null)
  const [status, setStatus] = useState('Loading...')
  const [submitted, setSubmitted] = useState(false)
  const [decision, setDecision] = useState(null) // 'approved' | 'feedback'
  const [theme, setTheme] = useState(getInitialTheme)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed)
  const [tocCollapsed, setTocCollapsed] = useState(getInitialTocCollapsed)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [origin, setOrigin] = useState('cli')
  const viewerRef = useRef(null)
  const prevLastActionRef = useRef(null)
  const toastTimerRef = useRef(null)
  const filesRef = useRef(files)
  filesRef.current = files

  const showToast = useCallback((message) => {
    if (toastTimerRef.current) {clearTimeout(toastTimerRef.current)}
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), 2500)
  }, [])

  // Derived state from active file
  const activeFile = files[activeFileIndex] || null
  const activeAnnState = activeFile?.annState || initialAnnotationState
  const { annotations } = activeAnnState
  const blocks = activeFile?.blocks || []
  const filePath = activeFile?.path || ''
  const totalAnnotationCount = files.reduce((sum, f) => sum + f.annState.annotations.length, 0)

  // Dispatch annotation actions to active file
  const annDispatch = useCallback((annAction) => {
    filesDispatch({ type: 'ANN', fileIndex: activeFileIndex, annAction })
  }, [activeFileIndex])

  // Handle DOM highlight side effects based on reducer lastAction
  // Element annotations (image/diagram) have no web-highlighter DOM, so skip them
  useEffect(() => {
    const { lastAction } = activeAnnState
    if (!lastAction || lastAction === prevLastActionRef.current) {return}
    prevLastActionRef.current = lastAction

    const hasNoHighlighter = (ann) =>
      ann?.targetType === 'image' || ann?.targetType === 'diagram' ||
      ann?.targetType === 'global' || ann?.type === 'INSERTION'

    if (lastAction.type === 'delete') {
      if (!hasNoHighlighter(lastAction.annotation)) {
        viewerRef.current?.removeHighlight(lastAction.annotation.id)
      }
    } else if (lastAction.type === 'edit') {
      if (!hasNoHighlighter(lastAction.updated)) {
        viewerRef.current?.updateHighlightType(lastAction.updated.id, lastAction.updated.type)
      }
    } else if (lastAction.type === 'undo') {
      const { entry } = lastAction
      if (hasNoHighlighter(entry.annotation)) {/* no-op for element annotations */}
      else if (entry.action === 'add') {
        viewerRef.current?.removeHighlight(entry.annotation.id)
      } else if (entry.action === 'delete') {
        viewerRef.current?.restoreHighlight(entry.annotation)
      } else if (entry.action === 'edit') {
        viewerRef.current?.updateHighlightType(entry.annotation.id, entry.annotation.type)
      }
    } else if (lastAction.type === 'redo') {
      const { entry } = lastAction
      if (hasNoHighlighter(entry.annotation)) {/* no-op for element annotations */}
      else if (entry.action === 'add') {
        viewerRef.current?.restoreHighlight(entry.annotation)
      } else if (entry.action === 'delete') {
        viewerRef.current?.removeHighlight(entry.annotation.id)
      } else if (entry.action === 'edit') {
        viewerRef.current?.updateHighlightType(entry.updated.id, entry.updated.type)
      }
    }
  }, [activeAnnState])

  useEffect(() => {
    localStorage.setItem('md-annotator-theme', theme)
    return applyTheme(theme)
  }, [theme])


  useEffect(() => {
    localStorage.setItem('md-annotator-sidebar-collapsed', sidebarCollapsed)
  }, [sidebarCollapsed])

  useEffect(() => {
    localStorage.setItem('md-annotator-toc-collapsed', tocCollapsed)
  }, [tocCollapsed])

  const toggleToc = useCallback(() => {
    setTocCollapsed(prev => !prev)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  const cycleTheme = useCallback(() => {
    setTheme(prev => {
      if (prev === 'auto') {return 'light'}
      if (prev === 'light') {return 'dark'}
      return 'auto'
    })
  }, [])

  const loadFiles = useCallback(async () => {
    try {
      setStatus('Loading...')

      // Try multi-file endpoint first
      const res = await fetch('/api/files')
      const json = await res.json()

      if (json.success) {
        const loadedFiles = json.data.files.map(f => ({
          index: f.index,
          path: f.path,
          content: f.content,
          blocks: parseMarkdownToBlocks(f.content),
          contentHash: f.contentHash,
          hashMismatch: f.hashMismatch || false
        }))
        filesDispatch({ type: 'INIT_FILES', files: loadedFiles })
        setOrigin(json.data.origin || 'cli')
        setStatus('Select text to annotate, then Approve or Submit Feedback.')
        return loadedFiles
      } else {
        setStatus('Error: ' + json.error)
      }
    } catch (err) {
      setStatus('Error: ' + err.message)
    }
    return null
  }, [])

  const loadAnnotations = useCallback(async (loadedFiles) => {
    for (let i = 0; i < loadedFiles.length; i++) {
      try {
        const res = await fetch(`/api/annotations?fileIndex=${i}`)
        const json = await res.json()
        if (json.success && json.data.annotations.length > 0) {
          if (json.data.contentHash === loadedFiles[i].contentHash) {
            filesDispatch({
              type: 'ANN',
              fileIndex: i,
              annAction: { type: 'RESTORE', annotations: json.data.annotations }
            })
            // Restore highlights only for initial active file
            if (i === 0) {
              setTimeout(() => {
                viewerRef.current?.restoreHighlights(json.data.annotations)
              }, 100)
            }
          } else {
            filesDispatch({
              type: 'UPDATE_FILE',
              fileIndex: i,
              updates: { hashMismatch: true }
            })
          }
        }
      } catch (_err) {
        // Silent failure - persistence is best-effort
      }
    }
  }, [])

  useEffect(() => {
    loadFiles().then(loaded => {
      if (loaded) {loadAnnotations(loaded)}
    })
  }, [loadFiles, loadAnnotations])

  // Restore highlights when switching files (Viewer remounts via key)
  const prevFileIndexRef = useRef(0)
  useEffect(() => {
    if (prevFileIndexRef.current === activeFileIndex) {return}
    prevFileIndexRef.current = activeFileIndex
    prevLastActionRef.current = null
    setSelectedAnnotationId(null)

    if (annotations.length > 0) {
      setTimeout(() => {
        viewerRef.current?.restoreHighlights(annotations)
      }, 100)
    }
  }, [activeFileIndex, annotations])

  // Auto-save annotations to server (debounced, scoped to active file)
  useEffect(() => {
    if (submitted || !activeFile) {return}

    const timer = setTimeout(async () => {
      try {
        await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ annotations, fileIndex: activeFileIndex })
        })
      } catch (_err) {
        // Silent failure
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [annotations, submitted, activeFileIndex, activeFile])

  const handleAddAnnotation = useCallback((ann) => {
    annDispatch({ type: 'ADD', annotation: ann })
    setSidebarCollapsed(false)
  }, [annDispatch])

  const handleAddGlobalComment = useCallback(() => {
    const ann = {
      id: crypto.randomUUID(),
      blockId: '',
      startOffset: 0,
      endOffset: 0,
      type: 'COMMENT',
      targetType: 'global',
      text: '',
      originalText: '',
      createdAt: Date.now(),
      startMeta: null,
      endMeta: null
    }
    annDispatch({ type: 'ADD', annotation: ann })
    setSidebarCollapsed(false)
  }, [annDispatch])

  const handleEditGlobalComment = useCallback((id, text) => {
    annDispatch({ type: 'EDIT', id, annotationType: 'COMMENT', text })
  }, [annDispatch])

  const handleDeleteAnnotation = useCallback((id) => {
    annDispatch({ type: 'DELETE', id })
    setSelectedAnnotationId(prev => prev === id ? null : prev)
  }, [annDispatch])

  const handleEditAnnotation = useCallback((id, annotationType, text) => {
    annDispatch({ type: 'EDIT', id, annotationType, text })
  }, [annDispatch])

  const handlePanelEdit = useCallback((id) => {
    const ann = annotations.find(a => a.id === id)
    if (!ann) {return}
    // Global comments and insertions have no highlight DOM — editing is handled inline in the panel
    if (ann.targetType === 'global' || ann.type === 'INSERTION') {
      setSelectedAnnotationId(id)
      setSidebarCollapsed(false)
      return
    }
    viewerRef.current?.openEditToolbar(ann)
    setSelectedAnnotationId(id)
    setSidebarCollapsed(false)
  }, [annotations])

  const handleImportAnnotations = useCallback((jsonData) => {
    const result = validateAnnotationImport(jsonData)
    if (!result.valid) {
      alert(`Import failed: ${result.error}`)
      return
    }
    if (result.annotations.length === 0) {
      alert('No annotations found in file')
      return
    }
    if (result.contentHash && activeFile?.contentHash &&
        result.contentHash !== activeFile.contentHash) {
      const proceed = window.confirm(
        'File content has changed since these annotations were exported. ' +
        'Annotations may not align correctly.\n\nImport anyway?'
      )
      if (!proceed) {return}
    }
    if (result.filePath && filePath && result.filePath !== filePath) {
      const proceed = window.confirm(
        `These annotations were exported from "${result.filePath}" ` +
        `but current file is "${filePath}".\n\nImport anyway?`
      )
      if (!proceed) {return}
    }
    if (annotations.length > 0) {
      const proceed = window.confirm(
        `This will replace ${annotations.length} existing annotation(s) ` +
        `with ${result.annotations.length} imported annotation(s). ` +
        `Undo history will be lost.\n\nContinue?`
      )
      if (!proceed) {return}
    }
    viewerRef.current?.clearAllHighlights()
    annDispatch({ type: 'RESTORE', annotations: result.annotations })
    setTimeout(() => {
      viewerRef.current?.restoreHighlights(result.annotations)
    }, 100)
    showToast(`Imported ${result.annotations.length} annotation${result.annotations.length !== 1 ? 's' : ''}`)
  }, [activeFile, filePath, annotations, annDispatch, showToast])

  const handleUndo = useCallback(() => {
    annDispatch({ type: 'UNDO' })
  }, [annDispatch])

  const handleRedo = useCallback(() => {
    annDispatch({ type: 'REDO' })
  }, [annDispatch])

  const handleSelectAnnotation = useCallback((id) => {
    setSelectedAnnotationId(id)
  }, [])

  const handleSelectFile = useCallback((index) => {
    if (index === activeFileIndex) {return}
    setActiveFileIndex(index)
  }, [activeFileIndex])

  const handleOpenFile = useCallback(async (relativePath) => {
    const currentFiles = filesRef.current
    const pathOnly = relativePath.split(/[?#]/)[0]

    // Resolve relative path against current file's directory for deduplication
    const dir = filePath.replace(/[^/]*$/, '')
    const segments = (dir + pathOnly.replace(/^\.\//, '')).split('/')
    const resolved = []
    for (const seg of segments) {
      if (seg === '..') { resolved.pop() }
      else if (seg && seg !== '.') { resolved.push(seg) }
    }
    const resolvedPath = resolved.join('/')

    const existingIndex = currentFiles.findIndex(f =>
      f.path.replace(/^\.\//, '') === resolvedPath
    )
    if (existingIndex !== -1) {
      setActiveFileIndex(existingIndex)
      return
    }

    try {
      const params = new URLSearchParams({ path: pathOnly, relativeTo: filePath })
      const res = await fetch(`/api/file/open?${params}`)
      const json = await res.json()
      if (json.success) {
        const newFile = {
          index: json.data.index,
          path: json.data.path,
          content: json.data.content,
          blocks: parseMarkdownToBlocks(json.data.content),
          contentHash: json.data.contentHash,
          hashMismatch: false
        }
        filesDispatch({ type: 'ADD_FILE', file: newFile })
        setActiveFileIndex(currentFiles.length)
      } else {
        setStatus(`Could not open file: ${json.error}`)
      }
    } catch (err) {
      setStatus(`Error opening file: ${err.message}`)
    }
  }, [filePath])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'textarea' || tag === 'input') {return}

      const isMod = e.metaKey || e.ctrlKey

      if (isMod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
      if (isMod && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        handleRedo()
      }
      if (e.ctrlKey && !e.metaKey && e.key === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  const handleApprove = async () => {
    setSubmitted(true)
    setDecision('approved')
    try {
      await fetch('/api/approve', { method: 'POST' })
    } catch { /* server shuts down */ }
  }

  const handleSubmitFeedback = async () => {
    setSubmitted(true)
    setDecision('feedback')
    try {
      const feedbackFiles = files.map(f => ({
        path: f.path,
        annotations: f.annState.annotations,
        blocks: f.blocks
      }))
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: feedbackFiles })
      })
    } catch { /* server shuts down */ }
  }

  const [serverGone, setServerGone] = useState(false)

  useEffect(() => {
    if (serverGone) {return}
    const ping = async () => {
      try {
        const res = await fetch('/api/heartbeat', { method: 'POST' })
        if (!res.ok) {throw new Error('heartbeat failed')}
      } catch {
        setServerGone(true)
        clearInterval(intervalId)
      }
    }
    ping()
    const intervalId = setInterval(ping, 2000)
    return () => clearInterval(intervalId)
  }, [serverGone])

  const { state: autoCloseState, enableAndStart } = useAutoClose(submitted)
  const { width: panelWidth, handleMouseDown: handlePanelResize } = useResizablePanel('md-annotator-panel-width', 280, 1)
  const { width: tocWidth, handleMouseDown: handleTocResize } = useResizablePanel('md-annotator-toc-width', 220, -1)

  if (serverGone && !submitted) {
    return (
      <div className="app">
        <div className="done-screen">
          <div className="done-card">
            <div className="done-icon done-icon--disconnected">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/>
                <path d="M5 12.55a10.94 10.94 0 015.17-2.39"/>
                <path d="M10.71 5.05A16 16 0 0122.56 9"/>
                <path d="M1.42 9a15.91 15.91 0 014.7-2.88"/>
                <path d="M8.53 16.11a6 6 0 016.95 0"/>
                <line x1="12" y1="20" x2="12.01" y2="20"/>
              </svg>
            </div>
            <h1 className="done-title">Server Disconnected</h1>
            <p className="done-message">
              The server is no longer available. Your annotations have not been submitted.
            </p>
            <p className="done-hint">You can close this tab.</p>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="app">
        <div className="done-screen">
          <div className="done-card">
            <div className={`done-icon done-icon--${decision}`}>
              {decision === 'approved' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </div>
            <h1 className="done-title">
              {decision === 'approved' ? 'Approved' : 'Feedback Submitted'}
            </h1>
            <p className="done-message">
              {decision === 'approved'
                ? 'No changes requested. The file was approved as-is.'
                : `${totalAnnotationCount} annotation${totalAnnotationCount !== 1 ? 's' : ''} ${ORIGIN_LABELS[origin] ? `sent to ${ORIGIN_LABELS[origin]}` : 'submitted'}.`}
            </p>
            {serverGone
              ? <p className="done-hint done-hint--disconnected">Server disconnected. You can close this tab.</p>
              : <p className="done-hint">Waiting for server...</p>}
            <div className="done-autoclose">
              {autoCloseState.phase === 'counting' && (
                <p className="done-countdown">
                  This tab will close in <span className="done-countdown-number">{autoCloseState.remaining}</span> second{autoCloseState.remaining !== 1 ? 's' : ''}...
                </p>
              )}
              {autoCloseState.phase === 'closeFailed' && (
                <p className="done-hint">Could not close this tab automatically. Please close it manually.</p>
              )}
              {autoCloseState.phase === 'prompt' && (
                <label className="done-autoclose-prompt">
                  <input type="checkbox" checked={false} onChange={enableAndStart} />
                  <span>Auto-close this tab after 3 seconds</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleReloadFile = async () => {
    try {
      const res = await fetch('/api/files')
      const json = await res.json()
      if (json.success) {
        const updated = json.data.files.find(f => f.path === activeFile?.path)
        if (updated) {
          filesDispatch({
            type: 'UPDATE_FILE',
            fileIndex: activeFileIndex,
            updates: {
              content: updated.content,
              blocks: parseMarkdownToBlocks(updated.content),
              contentHash: updated.contentHash,
              hashMismatch: false,
              annState: { ...initialAnnotationState }
            }
          })
          viewerRef.current?.clearAllHighlights()
        }
      }
    } catch (err) {
      setStatus('Error reloading: ' + err.message)
    }
  }

  const hasAnyHashMismatch = files.some(f => f.hashMismatch)

  return (
    <div className="app">
      {hasAnyHashMismatch && (
        <div className="hash-mismatch-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>File has changed since annotations were saved. Annotations may be outdated.</span>
          <button onClick={handleReloadFile} className="btn btn-sm">Reload</button>
        </div>
      )}
      <header className="app-header">
        <div className="header-left">
          <button
            onClick={toggleToc}
            className="btn btn-icon"
            title={tocCollapsed ? 'Show table of contents' : 'Hide table of contents'}
            aria-label={tocCollapsed ? 'Show table of contents' : 'Hide table of contents'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
          <svg className="app-logo" viewBox="0 48 821 99" aria-label="md-annotator" role="img">
            <g transform="matrix(1,0,0,1,-53.9375,-433.25)">
              <path d="M168.625,539.5C169.042,537.583 169.5,535.521 170,533.313C170.5,531.104 170.75,529.375 170.75,528.125C170.75,526.542 170.479,525.292 169.938,524.375C169.396,523.458 168.417,523 167,523C165.583,523 164.125,523.521 162.625,524.563C161.125,525.604 159.667,526.979 158.25,528.688C156.833,530.396 155.479,532.333 154.188,534.5C152.896,536.667 151.75,538.875 150.75,541.125L142.625,577L125.875,577L133.5,541.875C134.083,539.292 134.583,536.792 135,534.375C135.417,531.958 135.625,529.708 135.625,527.625C135.625,524.542 134.458,523 132.125,523C130.958,523 129.625,523.542 128.125,524.625C126.625,525.708 125.125,527.104 123.625,528.813C122.125,530.521 120.708,532.458 119.375,534.625C118.042,536.792 117,539 116.25,541.25L109,577L91.5,577L102.625,523.375L95.5,521.75L95.5,517.5C96.833,516.833 98.479,516.208 100.438,515.625C102.396,515.042 104.458,514.563 106.625,514.188C108.792,513.813 111,513.521 113.25,513.313C115.5,513.104 117.583,513 119.5,513L122.125,514.5L117.25,532.75L117.75,532.75C119,530.5 120.521,528.188 122.312,525.813C124.104,523.438 126.125,521.313 128.375,519.438C130.625,517.563 133.042,516.021 135.625,514.813C138.208,513.604 140.833,513 143.5,513C144.5,513 145.542,513.167 146.625,513.5C147.708,513.833 148.729,514.438 149.688,515.313C150.646,516.188 151.417,517.375 152,518.875C152.583,520.375 152.875,522.292 152.875,524.625C152.875,525.792 152.771,527.125 152.562,528.625C152.354,530.125 152.083,531.5 151.75,532.75C153.167,530.167 154.833,527.667 156.75,525.25C158.667,522.833 160.729,520.729 162.938,518.938C165.146,517.146 167.479,515.708 169.938,514.625C172.396,513.542 174.958,513 177.625,513C180.792,513 183.375,514 185.375,516C187.375,518 188.375,520.75 188.375,524.25C188.375,526.917 188.125,529.458 187.625,531.875C187.125,534.292 186.583,536.833 186,539.5L178.875,568.375L187.625,568.375L187.625,572.625C186.792,573.292 185.646,573.958 184.188,574.625C182.729,575.292 181.167,575.875 179.5,576.375C177.833,576.875 176.125,577.292 174.375,577.625C172.625,577.958 171,578.125 169.5,578.125C166.5,578.125 164.417,577.521 163.25,576.313C162.083,575.104 161.5,573.75 161.5,572.25C161.5,569.833 162.083,566.5 163.25,562.25L168.625,539.5Z"/>
              <path d="M221,568.5C222.75,568.5 224.479,567.771 226.188,566.313C227.896,564.854 229.521,563.042 231.062,560.875C232.604,558.708 234.021,556.375 235.312,553.875C236.604,551.375 237.708,549.083 238.625,547L243.125,522.375C242.042,521.708 241.021,521.229 240.062,520.938C239.104,520.646 237.958,520.5 236.625,520.5C233.458,520.5 230.562,521.563 227.938,523.688C225.312,525.813 223.083,528.604 221.25,532.063C219.417,535.521 218,539.479 217,543.938C216,548.396 215.5,552.958 215.5,557.625C215.5,564.875 217.333,568.5 221,568.5ZM236.625,557.125C235.375,560.042 233.896,562.792 232.188,565.375C230.479,567.958 228.604,570.208 226.562,572.125C224.521,574.042 222.292,575.583 219.875,576.75C217.458,577.917 214.917,578.5 212.25,578.5C208,578.5 204.521,576.875 201.812,573.625C199.104,570.375 197.75,565.458 197.75,558.875C197.75,552.958 198.562,547.271 200.188,541.813C201.812,536.354 204.188,531.521 207.312,527.313C210.438,523.104 214.271,519.729 218.812,517.188C223.354,514.646 228.542,513.375 234.375,513.375C237.125,513.375 239.146,513.542 240.438,513.875C241.729,514.208 243.083,514.708 244.5,515.375L248.75,493.375L240.125,491.75L240.125,487.5C241.375,487 243.083,486.5 245.25,486C247.417,485.5 249.729,485.042 252.188,484.625C254.646,484.208 257.062,483.854 259.438,483.563C261.812,483.271 263.75,483.083 265.25,483L267.75,484.375L251.625,568.375L260.625,568.375L260.625,572.625C259.792,573.292 258.688,573.958 257.312,574.625C255.938,575.292 254.438,575.875 252.812,576.375C251.188,576.875 249.5,577.292 247.75,577.625C246,577.958 244.375,578.125 242.875,578.125C239.958,578.125 237.875,577.458 236.625,576.125C235.375,574.792 234.75,573.417 234.75,572C234.75,570.583 234.958,568.542 235.375,565.875C235.792,563.208 236.375,560.292 237.125,557.125L236.625,557.125Z"/>
              <path d="M271.625,536.875C271.625,533.875 272.583,531.458 274.5,529.625C276.417,527.792 278.958,526.875 282.125,526.875C285.292,526.875 287.875,527.792 289.875,529.625C291.875,531.458 292.875,533.875 292.875,536.875C292.875,539.875 291.875,542.271 289.875,544.063C287.875,545.854 285.292,546.75 282.125,546.75C278.958,546.75 276.417,545.854 274.5,544.063C272.583,542.271 271.625,539.875 271.625,536.875Z"/>
              <path d="M337,547.875C334.917,547.875 332.312,547.979 329.188,548.188C326.062,548.396 323.062,548.896 320.188,549.688C317.312,550.479 314.854,551.708 312.812,553.375C310.771,555.042 309.75,557.333 309.75,560.25C309.75,562.167 310.146,563.813 310.938,565.188C311.729,566.563 312.792,567.688 314.125,568.563C315.458,569.438 316.938,570.063 318.562,570.438C320.188,570.813 321.833,571 323.5,571C326.5,571 329.104,570.5 331.312,569.5C333.521,568.5 335.375,567.146 336.875,565.438C338.375,563.729 339.479,561.729 340.188,559.438C340.896,557.146 341.25,554.708 341.25,552.125L341.25,547.875L337,547.875ZM341.25,541.125L341.25,539.625C341.25,529.542 336.25,524.5 326.25,524.5C319.417,524.5 313.458,526.792 308.375,531.375L303.375,525.5C308.875,519.833 317.125,517 328.125,517C330.958,517 333.688,517.417 336.312,518.25C338.938,519.083 341.208,520.354 343.125,522.063C345.042,523.771 346.583,525.917 347.75,528.5C348.917,531.083 349.5,534.167 349.5,537.75L349.5,563.875C349.5,566.125 349.604,568.479 349.812,570.938C350.021,573.396 350.25,575.417 350.5,577L342.5,577C342.25,575.583 342.062,574.042 341.938,572.375C341.812,570.708 341.75,569.083 341.75,567.5L341.5,567.5C339.083,571.417 336.229,574.229 332.938,575.938C329.646,577.646 325.625,578.5 320.875,578.5C318.292,578.5 315.792,578.146 313.375,577.438C310.958,576.729 308.812,575.646 306.938,574.188C305.062,572.729 303.562,570.938 302.438,568.813C301.312,566.688 300.75,564.208 300.75,561.375C300.75,556.625 301.979,552.896 304.438,550.188C306.896,547.479 309.979,545.458 313.688,544.125C317.396,542.792 321.354,541.958 325.562,541.625C329.771,541.292 333.625,541.125 337.125,541.125L341.25,541.125Z"/>
              <path d="M376.5,518.5C376.667,520.083 376.771,521.646 376.812,523.188C376.854,524.729 376.875,526.292 376.875,527.875L377.125,527.875C378.042,526.292 379.208,524.833 380.625,523.5C382.042,522.167 383.625,521.021 385.375,520.063C387.125,519.104 388.979,518.354 390.938,517.813C392.896,517.271 394.833,517 396.75,517C404.25,517 409.792,518.979 413.375,522.938C416.958,526.896 418.75,532.542 418.75,539.875L418.75,577L410.5,577L410.5,544.625C410.5,538.125 409.375,533.146 407.125,529.688C404.875,526.229 400.708,524.5 394.625,524.5C394.208,524.5 393.042,524.667 391.125,525C389.208,525.333 387.188,526.25 385.062,527.75C382.938,529.25 381.042,531.5 379.375,534.5C377.708,537.5 376.875,541.667 376.875,547L376.875,577L368.625,577L368.625,531.375C368.625,529.792 368.562,527.792 368.438,525.375C368.312,522.958 368.167,520.667 368,518.5L376.5,518.5Z"/>
              <path d="M446,518.5C446.167,520.083 446.271,521.646 446.312,523.188C446.354,524.729 446.375,526.292 446.375,527.875L446.625,527.875C447.542,526.292 448.708,524.833 450.125,523.5C451.542,522.167 453.125,521.021 454.875,520.063C456.625,519.104 458.479,518.354 460.438,517.813C462.396,517.271 464.333,517 466.25,517C473.75,517 479.292,518.979 482.875,522.938C486.458,526.896 488.25,532.542 488.25,539.875L488.25,577L480,577L480,544.625C480,538.125 478.875,533.146 476.625,529.688C474.375,526.229 470.208,524.5 464.125,524.5C463.708,524.5 462.542,524.667 460.625,525C458.708,525.333 456.688,526.25 454.562,527.75C452.438,529.25 450.542,531.5 448.875,534.5C447.208,537.5 446.375,541.667 446.375,547L446.375,577L438.125,577L438.125,531.375C438.125,529.792 438.062,527.792 437.938,525.375C437.812,522.958 437.667,520.667 437.5,518.5L446,518.5Z"/>
              <path d="M557.75,547.75C557.75,544.5 557.229,541.458 556.188,538.625C555.146,535.792 553.667,533.333 551.75,531.25C549.833,529.167 547.521,527.521 544.812,526.313C542.104,525.104 539.042,524.5 535.625,524.5C532.208,524.5 529.146,525.104 526.438,526.313C523.729,527.521 521.438,529.167 519.562,531.25C517.688,533.333 516.229,535.792 515.188,538.625C514.146,541.458 513.625,544.5 513.625,547.75C513.625,551 514.146,554.042 515.188,556.875C516.229,559.708 517.688,562.167 519.562,564.25C521.438,566.333 523.729,567.979 526.438,569.188C529.146,570.396 532.208,571 535.625,571C539.042,571 542.104,570.396 544.812,569.188C547.521,567.979 549.833,566.333 551.75,564.25C553.667,562.167 555.146,559.708 556.188,556.875C557.229,554.042 557.75,551 557.75,547.75ZM566.75,547.75C566.75,552.167 565.979,556.25 564.438,560C562.896,563.75 560.75,567 558,569.75C555.25,572.5 551.979,574.646 548.188,576.188C544.396,577.729 540.208,578.5 535.625,578.5C531.125,578.5 526.979,577.729 523.188,576.188C519.396,574.646 516.125,572.5 513.375,569.75C510.625,567 508.479,563.75 506.938,560C505.396,556.25 504.625,552.167 504.625,547.75C504.625,543.333 505.396,539.25 506.938,535.5C508.479,531.75 510.625,528.5 513.375,525.75C516.125,523 519.396,520.854 523.188,519.313C526.979,517.771 531.125,517 535.625,517C540.208,517 544.396,517.771 548.188,519.313C551.979,520.854 555.25,523 558,525.75C560.75,528.5 562.896,531.75 564.438,535.5C565.979,539.25 566.75,543.333 566.75,547.75Z"/>
              <path d="M612,526L595.125,526L595.125,560.5C595.125,562.667 595.333,564.438 595.75,565.813C596.167,567.188 596.75,568.25 597.5,569C598.25,569.75 599.146,570.271 600.188,570.563C601.229,570.854 602.375,571 603.625,571C605.042,571 606.5,570.792 608,570.375C609.5,569.958 610.875,569.417 612.125,568.75L612.5,576.375C609.417,577.792 605.708,578.5 601.375,578.5C599.792,578.5 598.146,578.292 596.438,577.875C594.729,577.458 593.167,576.667 591.75,575.5C590.333,574.333 589.167,572.75 588.25,570.75C587.333,568.75 586.875,566.125 586.875,562.875L586.875,526L574.5,526L574.5,518.5L586.875,518.5L586.875,502L595.125,502L595.125,518.5L612,518.5L612,526Z"/>
              <path d="M656.5,547.875C654.417,547.875 651.812,547.979 648.688,548.188C645.562,548.396 642.562,548.896 639.688,549.688C636.812,550.479 634.354,551.708 632.312,553.375C630.271,555.042 629.25,557.333 629.25,560.25C629.25,562.167 629.646,563.813 630.438,565.188C631.229,566.563 632.292,567.688 633.625,568.563C634.958,569.438 636.438,570.063 638.062,570.438C639.688,570.813 641.333,571 643,571C646,571 648.604,570.5 650.812,569.5C653.021,568.5 654.875,567.146 656.375,565.438C657.875,563.729 658.979,561.729 659.688,559.438C660.396,557.146 660.75,554.708 660.75,552.125L660.75,547.875L656.5,547.875ZM660.75,541.125L660.75,539.625C660.75,529.542 655.75,524.5 645.75,524.5C638.917,524.5 632.958,526.792 627.875,531.375L622.875,525.5C628.375,519.833 636.625,517 647.625,517C650.458,517 653.188,517.417 655.812,518.25C658.438,519.083 660.708,520.354 662.625,522.063C664.542,523.771 666.083,525.917 667.25,528.5C668.417,531.083 669,534.167 669,537.75L669,563.875C669,566.125 669.104,568.479 669.312,570.938C669.521,573.396 669.75,575.417 670,577L662,577C661.75,575.583 661.562,574.042 661.438,572.375C661.312,570.708 661.25,569.083 661.25,567.5L661,567.5C658.583,571.417 655.729,574.229 652.438,575.938C649.146,577.646 645.125,578.5 640.375,578.5C637.792,578.5 635.292,578.146 632.875,577.438C630.458,576.729 628.312,575.646 626.438,574.188C624.562,572.729 623.062,570.938 621.938,568.813C620.812,566.688 620.25,564.208 620.25,561.375C620.25,556.625 621.479,552.896 623.938,550.188C626.396,547.479 629.479,545.458 633.188,544.125C636.896,542.792 640.854,541.958 645.062,541.625C649.271,541.292 653.125,541.125 656.625,541.125L660.75,541.125Z"/>
              <path d="M718.375,526L701.5,526L701.5,560.5C701.5,562.667 701.708,564.438 702.125,565.813C702.542,567.188 703.125,568.25 703.875,569C704.625,569.75 705.521,570.271 706.562,570.563C707.604,570.854 708.75,571 710,571C711.417,571 712.875,570.792 714.375,570.375C715.875,569.958 717.25,569.417 718.5,568.75L718.875,576.375C715.792,577.792 712.083,578.5 707.75,578.5C706.167,578.5 704.521,578.292 702.812,577.875C701.104,577.458 699.542,576.667 698.125,575.5C696.708,574.333 695.542,572.75 694.625,570.75C693.708,568.75 693.25,566.125 693.25,562.875L693.25,526L680.875,526L680.875,518.5L693.25,518.5L693.25,502L701.5,502L701.5,518.5L718.375,518.5L718.375,526Z"/>
              <path d="M779.75,547.75C779.75,544.5 779.229,541.458 778.188,538.625C777.146,535.792 775.667,533.333 773.75,531.25C771.833,529.167 769.521,527.521 766.812,526.313C764.104,525.104 761.042,524.5 757.625,524.5C754.208,524.5 751.146,525.104 748.438,526.313C745.729,527.521 743.438,529.167 741.562,531.25C739.688,533.333 738.229,535.792 737.188,538.625C736.146,541.458 735.625,544.5 735.625,547.75C735.625,551 736.146,554.042 737.188,556.875C738.229,559.708 739.688,562.167 741.562,564.25C743.438,566.333 745.729,567.979 748.438,569.188C751.146,570.396 754.208,571 757.625,571C761.042,571 764.104,570.396 766.812,569.188C769.521,567.979 771.833,566.333 773.75,564.25C775.667,562.167 777.146,559.708 778.188,556.875C779.229,554.042 779.75,551 779.75,547.75ZM788.75,547.75C788.75,552.167 787.979,556.25 786.438,560C784.896,563.75 782.75,567 780,569.75C777.25,572.5 773.979,574.646 770.188,576.188C766.396,577.729 762.208,578.5 757.625,578.5C753.125,578.5 748.979,577.729 745.188,576.188C741.396,574.646 738.125,572.5 735.375,569.75C732.625,567 730.479,563.75 728.938,560C727.396,556.25 726.625,552.167 726.625,547.75C726.625,543.333 727.396,539.25 728.938,535.5C730.479,531.75 732.625,528.5 735.375,525.75C738.125,523 741.396,520.854 745.188,519.313C748.979,517.771 753.125,517 757.625,517C762.208,517 766.396,517.771 770.188,519.313C773.979,520.854 777.25,523 780,525.75C782.75,528.5 784.896,531.75 786.438,535.5C787.979,539.25 788.75,543.333 788.75,547.75Z"/>
              <path d="M804.625,536.75C804.625,534.167 804.562,531.542 804.438,528.875C804.312,526.208 804.208,522.75 804.125,518.5L812.25,518.5L812.25,529.375L812.5,529.375C813.083,527.792 813.917,526.271 815,524.813C816.083,523.354 817.396,522.042 818.938,520.875C820.479,519.708 822.271,518.771 824.312,518.063C826.354,517.354 828.667,517 831.25,517C833.583,517 835.625,517.25 837.375,517.75L835.75,525.875C834.667,525.458 833.083,525.25 831,525.25C827.833,525.25 825.125,525.854 822.875,527.063C820.625,528.271 818.75,529.813 817.25,531.688C815.75,533.563 814.646,535.583 813.938,537.75C813.229,539.917 812.875,542 812.875,544L812.875,577L804.625,577L804.625,536.75Z"/>
            </g>
          </svg>
          <span className="version-badge">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}</span>
          {ORIGIN_LABELS[origin] && (
            <span className="origin-badge">{ORIGIN_LABELS[origin]}</span>
          )}
          <span className="app-filepath">{filePath}</span>
        </div>
        <div className="header-right">
          <button
            onClick={handleSubmitFeedback}
            className="btn btn-feedback"
            disabled={totalAnnotationCount === 0}
            title={totalAnnotationCount === 0 ? 'Add annotations first' : `Submit ${totalAnnotationCount} annotation(s)`}
          >
            Feedback
            {totalAnnotationCount > 0 && <span className="btn-badge">{totalAnnotationCount}</span>}
          </button>
          <button
            onClick={handleApprove}
            className="btn btn-approve"
            disabled={totalAnnotationCount > 0}
            title={totalAnnotationCount > 0 ? 'Remove annotations to approve' : 'Approve file as-is'}
          >
            Approve
          </button>
          <button
            onClick={cycleTheme}
            className="btn btn-icon"
            title={`Theme: ${theme}`}
            aria-label={`Theme: ${theme}`}
          >
            {theme === 'light' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
            {theme === 'dark' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
            {theme === 'auto' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor"/>
              </svg>
            )}
          </button>
          <button
            onClick={toggleSidebar}
            className="btn btn-icon"
            title={sidebarCollapsed ? 'Show annotations' : 'Hide annotations'}
            aria-label={sidebarCollapsed ? 'Show annotations' : 'Hide annotations'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
          </button>
        </div>
      </header>

      <FileTabsBar
        files={files}
        activeFileIndex={activeFileIndex}
        onSelectFile={handleSelectFile}
      />

      <main className="app-main">
        <TableOfContents
          blocks={blocks}
          annotations={annotations}
          collapsed={tocCollapsed}
          width={tocWidth}
        />
        {!tocCollapsed && (
          <div
            className="resize-handle"
            onMouseDown={handleTocResize}
          />
        )}
        <Viewer
          key={activeFile?.path || 'empty'}
          ref={viewerRef}
          blocks={blocks}
          annotations={annotations}
          onAddAnnotation={handleAddAnnotation}
          onEditAnnotation={handleEditAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onSelectAnnotation={handleSelectAnnotation}
          onOpenFile={handleOpenFile}
          selectedAnnotationId={selectedAnnotationId}
        />
        {!sidebarCollapsed && (
          <div
            className="resize-handle"
            onMouseDown={handlePanelResize}
          />
        )}
        <AnnotationPanel
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          onSelect={handleSelectAnnotation}
          onEdit={handlePanelEdit}
          onDelete={handleDeleteAnnotation}
          onExport={() => setExportModalOpen(true)}
          onImport={handleImportAnnotations}
          onAddGlobalComment={handleAddGlobalComment}
          onEditGlobalComment={handleEditGlobalComment}
          collapsed={sidebarCollapsed}
          width={panelWidth}
        />
      </main>

      <footer className="app-status">
        <span>{status}</span>
        {activeFile?.content && (
          <FileStats content={activeFile.content} />
        )}
      </footer>

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        annotations={annotations}
        blocks={blocks}
        filePath={filePath}
        contentHash={activeFile?.contentHash}
        onToast={showToast}
      />

      <UpdateBanner />
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
