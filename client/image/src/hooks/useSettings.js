import { useState, useCallback, useEffect } from 'react'
import { DEFAULT_ANNOTATION_COLOR } from '../utils/annotationColors.js'
import { getItem, setItem } from '../../../shared/utils/storage.js'

// Cookies, not localStorage: each invocation binds to a random port unless
// ANNOTAITR_PORT is set, and localStorage is scoped per-origin (host+port),
// so settings saved under one run's port would be invisible to the next.
// Cookies are scoped by domain only, so they survive the port changing.
const STORAGE_KEY = 'img-annotator-settings'

const DEFAULTS = {
  theme: 'auto',
  autoCloseDelay: 'off',
  colorMode: 'rotate',
  fixedColor: DEFAULT_ANNOTATION_COLOR
}

function loadSettings() {
  const raw = getItem(STORAGE_KEY)
  if (!raw) { return { ...DEFAULTS } }
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

function persistSettings(settings) {
  setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings)

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      persistSettings(next)
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULTS })
    persistSettings({ ...DEFAULTS })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'dark' || settings.theme === 'light') {
      root.setAttribute('data-theme', settings.theme)
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => root.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  return { settings, updateSetting, resetSettings }
}
