import { useState, useEffect, useRef, useCallback } from 'react'
import { parseMarkdownToBlocks } from './parser.js'
import { Viewer } from './Viewer.jsx'
import { AnnotationPanel } from './AnnotationPanel.jsx'
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

export default function App() {
  const [_markdown, setMarkdown] = useState('')
  const [filePath, setFilePath] = useState('')
  const [blocks, setBlocks] = useState([])
  const [annotations, setAnnotations] = useState([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null)
  const [status, setStatus] = useState('Loading...')
  const [submitted, setSubmitted] = useState(false)
  const [decision, setDecision] = useState(null) // 'approved' | 'feedback'
  const [theme, setTheme] = useState(getInitialTheme)
  const viewerRef = useRef(null)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('md-annotator-theme', theme)
  }, [theme])

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
        setStatus('Select text to annotate, then Approve or Submit Feedback.')
      } else {
        setStatus('Error: ' + json.error)
      }
    } catch (err) {
      setStatus('Error: ' + err.message)
    }
  }, [])

  useEffect(() => {
    loadFile()
  }, [loadFile])

  const handleAddAnnotation = useCallback((ann) => {
    setAnnotations(prev => [...prev, ann])
  }, [])

  const handleDeleteAnnotation = useCallback((id) => {
    viewerRef.current?.removeHighlight(id)
    setAnnotations(prev => prev.filter(a => a.id !== id))
    setSelectedAnnotationId(prev => prev === id ? null : prev)
  }, [])

  const handleSelectAnnotation = useCallback((id) => {
    setSelectedAnnotationId(id)
  }, [])

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
            <div className="done-icon">{decision === 'approved' ? '\u2713' : '\u2709'}</div>
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">md-annotator</h1>
          <span className="app-filepath">{filePath}</span>
        </div>
        <div className="header-right">
          <button
            onClick={cycleTheme}
            className="btn btn-theme"
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
            onClick={handleApprove}
            className="btn btn-approve"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Approve
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
            Submit Feedback{annotations.length > 0 ? ` (${annotations.length})` : ''}
          </button>
        </div>
      </header>

      <main className="app-main">
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
        />
      </main>

      <footer className="app-status">{status}</footer>
    </div>
  )
}
