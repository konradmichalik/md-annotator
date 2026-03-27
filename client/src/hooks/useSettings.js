import { useState, useCallback, useEffect } from 'react'
import { getItem, setItem } from '../utils/storage.js'

const COOKIE_KEY = 'md-annotator-settings'

const DEFAULTS = {
  theme: 'auto',
  contentWidth: 900,
  fontSize: 15,
  defaultMode: 'select',
  autoCloseDelay: 'off',
  autoSaveDrafts: true,
}

function loadSettings() {
  const raw = getItem(COOKIE_KEY)
  if (!raw) {return { ...DEFAULTS }}
  try {
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

function persistSettings(settings) {
  setItem(COOKIE_KEY, JSON.stringify(settings))
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings)

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      persistSettings(next)
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULTS })
    persistSettings({ ...DEFAULTS })
  }, [])

  // Apply CSS custom properties when settings change
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--content-max-width', `${settings.contentWidth}px`)
    root.style.setProperty('--base-font-size', `${settings.fontSize}px`)
  }, [settings.contentWidth, settings.fontSize])

  // Apply theme
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'dark' || settings.theme === 'light') {
      root.setAttribute('data-theme', settings.theme)
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    root.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
    const onChange = () => root.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings.theme])

  return { settings, updateSetting, resetSettings }
}
