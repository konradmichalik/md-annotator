/* global __APP_VERSION__ */
import { useEffect, useReducer, useState, useCallback } from 'react'
import { annotationReducer, initialAnnotationState, createAnnotationId } from './state/annotationReducer.js'
import Toolbar from './components/Toolbar.jsx'
import ImageCanvas from './components/ImageCanvas.jsx'
import AnnotationPanel from './components/AnnotationPanel.jsx'
import ExportModal from './components/ExportModal.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { useSettings } from './hooks/useSettings.js'
import { useAutoClose } from './hooks/useAutoClose.js'
import appIcon from './assets/icon-img-annotator.svg?inline'

const ORIGIN_LABELS = {
  'claude-code': 'Claude Code',
  'opencode': 'OpenCode',
  'vibe': 'Mistral Vibe'
}

export default function App() {
  const [state, dispatch] = useReducer(annotationReducer, initialAnnotationState)
  const [meta, setMeta] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [decision, setDecision] = useState(null)
  const [activeTool, setActiveTool] = useState('select')
  const [showExport, setShowExport] = useState(false)
  const [editingAnnotationId, setEditingAnnotationId] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { settings, updateSetting, resetSettings } = useSettings()
  const { state: autoCloseState, enableAndStart } = useAutoClose(!!decision, settings.autoCloseDelay)

  useEffect(() => {
    fetch('/api/meta').then((r) => r.json()).then((r) => setMeta(r.data))
    setImageUrl('/api/image')
    fetch('/api/annotations')
      .then((r) => r.json())
      .then((r) => dispatch({ type: 'SET_ALL', annotations: r.data.annotations }))
  }, [])

  useEffect(() => {
    if (!meta) { return }
    fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotations: state.annotations })
    })
  }, [state.annotations, meta])

  const addAnnotation = useCallback((partial) => {
    dispatch({
      type: 'ADD',
      annotation: { id: createAnnotationId(), createdAt: Date.now(), ...partial }
    })
  }, [])

  const removeAnnotation = useCallback((id) => {
    dispatch({ type: 'REMOVE', id })
  }, [])

  const updateAnnotation = useCallback((id, changes) => {
    dispatch({ type: 'UPDATE', id, changes })
  }, [])

  const importAnnotations = useCallback((annotations) => {
    dispatch({ type: 'SET_ALL', annotations })
  }, [])

  const submit = useCallback(async (endpoint) => {
    const res = await fetch(`/api/${endpoint}`, { method: 'POST' })
    if (res.ok) { setDecision(endpoint === 'approve' ? 'approved' : 'feedback') }
  }, [])

  const zoomBy = useCallback((delta) => {
    setZoom((z) => Math.round(Math.max(0.1, Math.min(3, z + delta)) * 100) / 100)
  }, [])

  const zoomReset = useCallback(() => setZoom(1), [])

  const zoomFit = useCallback(() => {
    if (!meta) { return }
    const appMain = document.querySelector('.app-main')
    if (!appMain) { return }
    const availableWidth = appMain.clientWidth - 24
    const availableHeight = appMain.clientHeight - 76
    const fit = Math.min(availableWidth / meta.width, availableHeight / meta.height)
    setZoom(Math.round(Math.max(0.1, Math.min(3, fit)) * 100) / 100)
  }, [meta])

  const annotationCount = state.annotations.length
  const origin = meta?.origin

  if (decision) {
    return (
      <div className="app-shell">
        <div className="done-screen">
          <div className="done-card">
            <div className={`done-icon done-icon--${decision}`}>
              {decision === 'approved' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </div>
            <h1 className="done-title">
              {decision === 'approved'
                ? (annotationCount > 0 ? 'Approved with Notes' : 'Approved')
                : 'Feedback Submitted'}
            </h1>
            <p className="done-message">
              {decision === 'approved'
                ? (annotationCount > 0
                  ? `Approved as-is. ${annotationCount} annotation${annotationCount === 1 ? '' : 's'} passed along as notes.`
                  : 'No changes requested. The image was approved as-is.')
                : `${annotationCount} annotation${annotationCount === 1 ? '' : 's'} ${ORIGIN_LABELS[origin] ? `sent to ${ORIGIN_LABELS[origin]}` : 'submitted'}.`}
            </p>
            <p className="done-hint">
              {decision === 'feedback' && ORIGIN_LABELS[origin]
                ? `${ORIGIN_LABELS[origin]} is processing your feedback.`
                : 'You can close this tab.'}
            </p>
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
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => {
                      updateSetting('autoCloseDelay', '3')
                      enableAndStart()
                    }}
                  />
                  <span>Auto-close this tab after 3 seconds</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <img src={appIcon} alt="" className="app-icon" width="20" height="20" />
          <span className="app-name">web&middot;annotator</span>
          <span className="version-badge">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}</span>
          {ORIGIN_LABELS[origin] && (
            <span className="origin-badge">{ORIGIN_LABELS[origin]}</span>
          )}
          {meta?.targetLabel && <span className="app-target">{meta.targetLabel}</span>}
        </div>
        <div className="header-right">
          <button
            type="button"
            onClick={() => submit('submit')}
            className="btn btn-feedback"
            disabled={annotationCount === 0}
            title={annotationCount === 0 ? 'Add annotations first' : `Submit ${annotationCount} annotation(s)`}
          >
            Feedback
            {annotationCount > 0 && <span className="btn-badge">{annotationCount}</span>}
          </button>
          <button
            type="button"
            onClick={() => submit('approve')}
            className="btn btn-approve"
            title={annotationCount > 0
              ? `Approve as-is and pass ${annotationCount} annotation(s) along as notes`
              : 'Approve the image as-is'}
          >
            {annotationCount > 0 ? 'Approve with Notes' : 'Approve'}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="btn btn-icon"
            title="Settings"
            aria-label="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="app-body">
        <div className="app-main">
          <Toolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            zoom={zoom}
            onZoomBy={zoomBy}
            onZoomReset={zoomReset}
            onZoomFit={zoomFit}
            colorMode={settings.colorMode}
            fixedColor={settings.fixedColor}
            onChangeColorMode={(mode) => updateSetting('colorMode', mode)}
            onChangeFixedColor={(color) => updateSetting('fixedColor', color)}
          />
          {imageUrl && meta && (
            <ImageCanvas
              imageUrl={imageUrl}
              imageWidth={meta.width}
              imageHeight={meta.height}
              activeTool={activeTool}
              annotations={state.annotations}
              zoom={zoom}
              onZoomBy={zoomBy}
              editingAnnotationId={editingAnnotationId}
              onAddAnnotation={addAnnotation}
              onUpdateAnnotation={updateAnnotation}
              onRemoveAnnotation={removeAnnotation}
              onRequestEdit={setEditingAnnotationId}
              colorMode={settings.colorMode}
              fixedColor={settings.fixedColor}
            />
          )}
        </div>
        <div className="app-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-header-title">
              <span>Annotations</span>
              {annotationCount > 0 && <span className="panel-badge">{annotationCount}</span>}
            </div>
            <button type="button" className="btn" onClick={() => setShowExport(true)}>Export / Import</button>
          </div>
          <AnnotationPanel annotations={state.annotations} onRemove={removeAnnotation} onEdit={setEditingAnnotationId} />
        </div>
      </div>

      <footer className="app-status">
        <span>Click a mark to select it, drag to move, or press Delete to remove it.</span>
        {meta && <span className="image-stats">{meta.width} &times; {meta.height}px</span>}
      </footer>

      {showExport && (
        <ExportModal
          annotations={state.annotations}
          onImport={importAnnotations}
          onClose={() => setShowExport(false)}
        />
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        updateSetting={updateSetting}
        resetSettings={resetSettings}
      />
    </div>
  )
}
