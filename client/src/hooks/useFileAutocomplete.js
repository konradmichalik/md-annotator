import { useState, useEffect, useMemo, useCallback } from 'react'

const MAX_VISIBLE = 10

// --- Pure helpers (exported for testing) ---

export function detectTrigger(value, cursorPos) {
  if (cursorPos === 0) { return null }
  for (let i = cursorPos - 1; i >= 0; i--) {
    const ch = value[i]
    if (ch === '@') {
      if (i === 0 || /\s/.test(value[i - 1])) {
        const query = value.slice(i + 1, cursorPos)
        if (query.includes('\n')) { return null }
        return { triggerIndex: i, query }
      }
      return null
    }
    if (ch === '\n') { return null }
  }
  return null
}

export function filterFiles(files, query) {
  if (!query) { return files.slice(0, MAX_VISIBLE) }
  const lower = query.toLowerCase()
  const matches = files.filter(f => f.toLowerCase().includes(lower))
  matches.sort((a, b) => {
    const aStarts = a.toLowerCase().startsWith(lower)
    const bStarts = b.toLowerCase().startsWith(lower)
    if (aStarts && !bStarts) { return -1 }
    if (!aStarts && bStarts) { return 1 }
    return a.localeCompare(b)
  })
  return matches.slice(0, MAX_VISIBLE)
}

export function insertFileReference(value, triggerIndex, cursorPos, filePath) {
  const before = value.slice(0, triggerIndex)
  const after = value.slice(cursorPos)
  const reference = `@${filePath}`
  const needsSpace = after.length > 0 && after[0] !== ' '
  const newValue = before + reference + (needsSpace ? ' ' : '') + after
  const newCursorPos = before.length + reference.length + (needsSpace ? 1 : 0)
  return { newValue, newCursorPos }
}

// --- Module-level cache ---

let cachedFiles = null
let fetchPromise = null

function fetchWorkspaceFiles() {
  if (cachedFiles !== null) { return Promise.resolve(cachedFiles) }
  if (fetchPromise) { return fetchPromise }
  fetchPromise = fetch('/api/workspace/files')
    .then(r => {
      if (!r.ok) { throw new Error(`HTTP ${r.status}`) }
      return r.json()
    })
    .then(json => {
      cachedFiles = json.success ? json.data.files : []
      fetchPromise = null
      return cachedFiles
    })
    .catch(() => {
      fetchPromise = null // allow retry on next call
      return []
    })
  return fetchPromise
}

// --- Hook ---

export function useFileAutocomplete(value, cursorPos) {
  const [files, setFiles] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [dismissedTriggerIndex, setDismissedTriggerIndex] = useState(null)

  useEffect(() => {
    fetchWorkspaceFiles().then(f => {
      setFiles(f)
    })
  }, [])

  const trigger = useMemo(
    () => detectTrigger(value, cursorPos),
    [value, cursorPos]
  )

  // Reset dismiss when input value changes (user is actively editing)
  useEffect(() => {
    setDismissedTriggerIndex(null)
  }, [value])

  const isOpen = trigger !== null
    && files !== null
    && files.length > 0
    && trigger.triggerIndex !== dismissedTriggerIndex

  const items = useMemo(() => {
    if (!isOpen) { return [] }
    return filterFiles(files, trigger.query)
  }, [isOpen, files, trigger?.query])

  useEffect(() => {
    setActiveIndex(0)
  }, [items])

  const showDropdown = isOpen && items.length > 0

  const handleKeyDown = useCallback((e) => {
    if (!showDropdown) { return null }

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setDismissedTriggerIndex(trigger?.triggerIndex ?? null)
      return 'dismiss'
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % items.length)
      return 'navigate'
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + items.length) % items.length)
      return 'navigate'
    }

    if ((e.key === 'Enter' && !e.metaKey && !e.ctrlKey) || e.key === 'Tab') {
      e.preventDefault()
      return 'accept'
    }

    return null
  }, [showDropdown, items.length, trigger?.triggerIndex])

  const accept = useCallback((index) => {
    if (!trigger || !items[index ?? activeIndex]) { return null }
    const filePath = items[index ?? activeIndex]
    return insertFileReference(value, trigger.triggerIndex, cursorPos, filePath)
  }, [trigger, items, activeIndex, value, cursorPos])

  return {
    isOpen: showDropdown,
    items,
    activeIndex,
    handleKeyDown,
    accept,
  }
}
