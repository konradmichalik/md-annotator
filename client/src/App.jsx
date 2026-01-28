import { useState, useEffect, useRef, useCallback } from 'react'
import { parseMarkdownToBlocks } from './parser.js'
import { Viewer } from './Viewer.jsx'
import { AnnotationPanel } from './AnnotationPanel.jsx'
import './styles.css'

export default function App() {
  const [markdown, setMarkdown] = useState('')
  const [filePath, setFilePath] = useState('')
  const [blocks, setBlocks] = useState([])
  const [annotations, setAnnotations] = useState([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null)
  const [status, setStatus] = useState('Loading...')
  const [submitted, setSubmitted] = useState(false)
  const [decision, setDecision] = useState(null) // 'approved' | 'feedback'
  const viewerRef = useRef(null)

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
            onClick={handleApprove}
            className="btn btn-approve"
          >
            Approve
          </button>
          <button
            onClick={handleSubmitFeedback}
            className="btn btn-feedback"
            disabled={annotations.length === 0}
            title={annotations.length === 0 ? 'Add annotations first' : `Submit ${annotations.length} annotation(s)`}
          >
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
