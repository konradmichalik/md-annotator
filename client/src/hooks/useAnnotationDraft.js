import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_PREFIX = 'md-annotator-draft-'
const DEBOUNCE_MS = 500

function formatTimeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) {return 'just now'}
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`}
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {return `${hours} hour${hours !== 1 ? 's' : ''} ago`}
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function getDraftKey(contentHash) {
  return contentHash ? `${STORAGE_PREFIX}${contentHash}` : null
}

export function useAnnotationDraft({ annotations, contentHash, submitted }) {
  const [draftBanner, setDraftBanner] = useState(null)
  const draftDataRef = useRef(null)
  const timerRef = useRef(null)
  const hasMountedRef = useRef(false)

  const key = getDraftKey(contentHash)

  // Load draft on mount
  useEffect(() => {
    if (!key) {return}

    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const data = JSON.parse(raw)
        if (Array.isArray(data.annotations) && data.annotations.length > 0) {
          draftDataRef.current = data
          setDraftBanner({
            count: data.annotations.length,
            timeAgo: formatTimeAgo(data.ts || 0),
          })
        }
      }
    } catch {
      // Corrupted draft — ignore
    }
    hasMountedRef.current = true
  }, [key])

  // Debounced auto-save on annotation changes (exclude AI Notes)
  useEffect(() => {
    if (!key || submitted || !hasMountedRef.current) {return}
    const userAnnotations = annotations.filter(a => a.type !== 'NOTES')
    if (userAnnotations.length === 0) {
      // Clear draft when all user annotations removed
      try { localStorage.removeItem(key) } catch { /* noop */ }
      return
    }

    if (timerRef.current) {clearTimeout(timerRef.current)}

    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({
          annotations: userAnnotations,
          ts: Date.now(),
        }))
      } catch {
        // Storage full or unavailable — silent failure
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) {clearTimeout(timerRef.current)}
    }
  }, [annotations, key, submitted])

  // Clear draft on submit
  useEffect(() => {
    if (submitted && key) {
      try { localStorage.removeItem(key) } catch { /* noop */ }
    }
  }, [submitted, key])

  const restoreDraft = useCallback(() => {
    const data = draftDataRef.current
    setDraftBanner(null)
    draftDataRef.current = null
    return data?.annotations || []
  }, [])

  const dismissDraft = useCallback(() => {
    setDraftBanner(null)
    draftDataRef.current = null
    if (key) {
      try { localStorage.removeItem(key) } catch { /* noop */ }
    }
  }, [key])

  return { draftBanner, restoreDraft, dismissDraft }
}
