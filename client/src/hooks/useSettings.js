import { useState, useCallback, useEffect } from 'react'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365
const COOKIE_KEY = 'md-annotator-settings'

const DEFAULTS = {
  theme: 'auto',
  contentWidth: 900,
  fontSize: 15,
  defaultMode: 'select',
  autoCloseDelay: 'off',
  autoSaveDrafts: true,
}

function readCookie(key) {
  try {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

function writeCookie(key, value) {
  try {
    const encoded = encodeURIComponent(value)
    document.cookie = `${key}=${encoded}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
  } catch {
    // Cookie not available
  }
}

function loadSettings() {
  const raw = readCookie(COOKIE_KEY)
  if (!raw) {return { ...DEFAULTS }}
  try {
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

function persistSettings(settings) {
  writeCookie(COOKIE_KEY, JSON.stringify(settings))
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
