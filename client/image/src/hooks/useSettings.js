import { useState, useCallback, useEffect } from 'react'
import { DEFAULT_ANNOTATION_COLOR } from '../utils/annotationColors.js'

// Kept as its own key (not part of the settings blob below): client/index.html
// reads it synchronously before React mounts, to paint the correct theme on
// first frame without a flash of the wrong one.
const THEME_KEY = 'img-annotator-theme'
const STORAGE_KEY = 'img-annotator-settings'

const DEFAULTS = {
  theme: 'auto',
  autoCloseDelay: 'off',
  colorMode: 'rotate',
  fixedColor: DEFAULT_ANNOTATION_COLOR
}

function loadSettings() {
  const theme = localStorage.getItem(THEME_KEY) || DEFAULTS.theme
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) { return { ...DEFAULTS, theme } }
    return { ...DEFAULTS, ...JSON.parse(raw), theme }
  } catch {
    return { ...DEFAULTS, theme }
  }
}

function persistSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    localStorage.setItem(THEME_KEY, settings.theme)
  } catch {
    // localStorage unavailable (private browsing, disabled storage) - settings just won't persist
  }
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
