import { useState, useEffect, useRef, useCallback, useReducer } from 'react'
import { parseMarkdownToBlocks } from './parser.js'
import { Viewer } from './Viewer.jsx'
import { AnnotationPanel } from './AnnotationPanel.jsx'
import { TableOfContents } from './TableOfContents.jsx'
import { ExportModal } from './ExportModal.jsx'
import { UpdateBanner } from './UpdateBanner.jsx'
import './styles.css'

// Theme: 'light' | 'dark' | 'auto'
function getInitialTheme() {
  const stored = localStorage.getItem('md-annotator-theme')
  return stored || 'auto'
}

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else if (theme === 'light') {
    root.setAttribute('data-theme', 'light')
  } else {
    root.removeAttribute('data-theme')
  }
}

function getInitialSidebarCollapsed() {
  return localStorage.getItem('md-annotator-sidebar-collapsed') === 'true'
}

function getInitialTocCollapsed() {
  return localStorage.getItem('md-annotator-toc-collapsed') === 'true'
}

function annotationReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      return {
        annotations: [...state.annotations, action.annotation],
        history: [...state.history, { action: 'add', annotation: action.annotation }],
        redo: [],
        lastAction: { type: 'add', annotation: action.annotation }
      }
    }
    case 'DELETE': {
      const deleted = state.annotations.find(a => a.id === action.id)
      if (!deleted) {return state}
      return {
        annotations: state.annotations.filter(a => a.id !== action.id),
        history: [...state.history, { action: 'delete', annotation: deleted }],
        redo: [],
        lastAction: { type: 'delete', annotation: deleted }
      }
    }
    case 'UNDO': {
      if (state.history.length === 0) {return state}
      const entry = state.history[state.history.length - 1]
      return {
        annotations: entry.action === 'add'
          ? state.annotations.filter(a => a.id !== entry.annotation.id)
          : [...state.annotations, entry.annotation],
        history: state.history.slice(0, -1),
        redo: [...state.redo, entry],
        lastAction: { type: 'undo', entry }
      }
    }
    case 'REDO': {
      if (state.redo.length === 0) {return state}
      const entry = state.redo[state.redo.length - 1]
      return {
        annotations: entry.action === 'add'
          ? [...state.annotations, entry.annotation]
          : state.annotations.filter(a => a.id !== entry.annotation.id),
        history: [...state.history, entry],
        redo: state.redo.slice(0, -1),
        lastAction: { type: 'redo', entry }
      }
    }
    case 'RESTORE': {
      return {
        annotations: action.annotations,
        history: [],
        redo: [],
        lastAction: null
      }
    }
    default: return state
  }
}

const initialAnnotationState = {
  annotations: [],
  history: [],
  redo: [],
  lastAction: null
}

export default function App() {
  const [_markdown, setMarkdown] = useState('')
  const [filePath, setFilePath] = useState('')
  const [blocks, setBlocks] = useState([])
  const [annState, dispatch] = useReducer(annotationReducer, initialAnnotationState)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null)
  const [status, setStatus] = useState('Loading...')
  const [submitted, setSubmitted] = useState(false)
  const [decision, setDecision] = useState(null) // 'approved' | 'feedback'
  const [theme, setTheme] = useState(getInitialTheme)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed)
  const [tocCollapsed, setTocCollapsed] = useState(getInitialTocCollapsed)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [_contentHash, setContentHash] = useState(null)
  const [hashMismatch, setHashMismatch] = useState(false)
  const viewerRef = useRef(null)
  const prevLastActionRef = useRef(null)

  const { annotations } = annState

  // Handle DOM highlight side effects based on reducer lastAction
  useEffect(() => {
    const { lastAction } = annState
    if (!lastAction || lastAction === prevLastActionRef.current) {return}
    prevLastActionRef.current = lastAction

    if (lastAction.type === 'delete') {
      viewerRef.current?.removeHighlight(lastAction.annotation.id)
    } else if (lastAction.type === 'undo') {
      const { entry } = lastAction
      if (entry.action === 'add') {
        viewerRef.current?.removeHighlight(entry.annotation.id)
      } else {
        viewerRef.current?.restoreHighlight(entry.annotation)
      }
    } else if (lastAction.type === 'redo') {
      const { entry } = lastAction
      if (entry.action === 'add') {
        viewerRef.current?.restoreHighlight(entry.annotation)
      } else {
        viewerRef.current?.removeHighlight(entry.annotation.id)
      }
    }
  }, [annState])

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('md-annotator-theme', theme)
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

  const loadFile = useCallback(async () => {
    try {
      setStatus('Loading...')
      const res = await fetch('/api/file')
      const json = await res.json()
      if (json.success) {
        setMarkdown(json.data.content)
        setFilePath(json.data.path)
        setBlocks(parseMarkdownToBlocks(json.data.content))
        setContentHash(json.data.contentHash || null)
        setStatus('Select text to annotate, then Approve or Submit Feedback.')
        return json.data.contentHash || null
      } else {
        setStatus('Error: ' + json.error)
      }
    } catch (err) {
      setStatus('Error: ' + err.message)
    }
    return null
  }, [])

  const loadAnnotations = useCallback(async (expectedHash) => {
    try {
      const res = await fetch('/api/annotations')
      const json = await res.json()
      if (json.success && json.data.annotations.length > 0) {
        if (json.data.contentHash === expectedHash) {
          dispatch({ type: 'RESTORE', annotations: json.data.annotations })
          setTimeout(() => {
            viewerRef.current?.restoreHighlights(json.data.annotations)
          }, 100)
        } else {
          setHashMismatch(true)
        }
      }
    } catch (_err) {
      // Silent failure - persistence is best-effort
    }
  }, [])

  useEffect(() => {
    loadFile().then(hash => {
      if (hash) {loadAnnotations(hash)}
    })
  }, [loadFile, loadAnnotations])

  // Auto-save annotations to server (debounced)
  useEffect(() => {
    if (submitted) {return}

    const timer = setTimeout(async () => {
      try {
        await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ annotations })
        })
      } catch (_err) {
        // Silent failure
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [annotations, submitted])

  const handleAddAnnotation = useCallback((ann) => {
    dispatch({ type: 'ADD', annotation: ann })
    setSidebarCollapsed(false)
  }, [])

  const handleDeleteAnnotation = useCallback((id) => {
    dispatch({ type: 'DELETE', id })
    setSelectedAnnotationId(prev => prev === id ? null : prev)
  }, [])

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' })
  }, [])

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' })
  }, [])

  const handleSelectAnnotation = useCallback((id) => {
    setSelectedAnnotationId(id)
  }, [])

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
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotations, blocks })
      })
    } catch { /* server shuts down */ }
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
                : `${annotations.length} annotation${annotations.length !== 1 ? 's' : ''} sent to Claude Code.`}
            </p>
            <p className="done-hint">You can close this tab.</p>
          </div>
        </div>
      </div>
    )
  }

  const handleReloadFile = async () => {
    setHashMismatch(false)
    dispatch({ type: 'RESTORE', annotations: [] })
    viewerRef.current?.clearAllHighlights()
    await loadFile()
  }

  return (
    <div className="app">
      {hashMismatch && (
        <div className="hash-mismatch-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>File has changed since annotations were saved. Annotations may be outdated.</span>
          <button onClick={handleReloadFile} className="btn btn-sm">Reload</button>
          <button onClick={() => setHashMismatch(false)} className="btn btn-sm">Dismiss</button>
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
          <h1 className="app-title">md-annotator</h1>
          <span className="app-filepath">{filePath}</span>
        </div>
        <div className="header-right">
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
            onClick={handleSubmitFeedback}
            className="btn btn-feedback"
            disabled={annotations.length === 0}
            title={annotations.length === 0 ? 'Add annotations first' : `Submit ${annotations.length} annotation(s)`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Feedback{annotations.length > 0 ? ` (${annotations.length})` : ''}
          </button>
          <button
            onClick={handleApprove}
            className="btn btn-approve"
            disabled={annotations.length > 0}
            title={annotations.length > 0 ? 'Remove annotations to approve' : 'Approve file as-is'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Approve
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

      <main className="app-main">
        <TableOfContents
          blocks={blocks}
          annotations={annotations}
          collapsed={tocCollapsed}
        />
        <Viewer
          ref={viewerRef}
          blocks={blocks}
          annotations={annotations}
          onAddAnnotation={handleAddAnnotation}
          onSelectAnnotation={handleSelectAnnotation}
          selectedAnnotationId={selectedAnnotationId}
        />
        <AnnotationPanel
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          onSelect={handleSelectAnnotation}
          onDelete={handleDeleteAnnotation}
          onExport={() => setExportModalOpen(true)}
          collapsed={sidebarCollapsed}
        />
      </main>

      <footer className="app-status">{status}</footer>

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        annotations={annotations}
        blocks={blocks}
        filePath={filePath}
      />

      <UpdateBanner />
    </div>
  )
}
