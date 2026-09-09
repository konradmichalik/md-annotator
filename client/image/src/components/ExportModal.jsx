import { useState } from 'react'
import { serializeAnnotations, parseAnnotationsJson } from '../utils/exportImport.js'

export default function ExportModal({ annotations, onImport, onClose }) {
  const [draft, setDraft] = useState(() => serializeAnnotations(annotations))
  const [error, setError] = useState(null)

  const handleImport = () => {
    try {
      onImport(parseAnnotationsJson(draft))
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <h2>Export / Import Annotations</h2>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="button" className="btn btn-primary" onClick={handleImport}>Import</button>
        <button type="button" className="btn" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
