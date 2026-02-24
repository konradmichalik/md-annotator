import { useState } from 'react'
import { useUpdateCheck } from '../hooks/useUpdateCheck.js'

const UPDATE_COMMAND = 'claude plugin update annotate@md-annotator'

export function UpdateBanner() {
  const updateInfo = useUpdateCheck()
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(UPDATE_COMMAND)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_e) {
      // ignore
    }
  }

  if (!updateInfo?.updateAvailable || dismissed) {
    return null
  }

  return (
    <div className="update-banner">
      <div className="update-banner-content">
        <div className="update-banner-header">
          <div className="update-banner-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </div>
          <div className="update-banner-text">
            <strong className="update-banner-title">Update available</strong>
            <span className="update-banner-version">
              {updateInfo.latestVersion} available (you have {updateInfo.currentVersion})
            </span>
          </div>
          <button
            className="update-banner-dismiss"
            onClick={() => setDismissed(true)}
            title="Dismiss"
            aria-label="Dismiss update notification"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="update-banner-actions">
          <button className="update-banner-copy" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy update command'}
          </button>
          <a
            className="update-banner-notes"
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Notes
          </a>
        </div>
      </div>
    </div>
  )
}
