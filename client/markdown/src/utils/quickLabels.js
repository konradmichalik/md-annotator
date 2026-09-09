/**
 * Quick annotation labels for fast categorization.
 * Alt+1–0 shortcuts apply a label directly to the current selection.
 */
import { getItem } from './storage.js'

const STORAGE_KEY = 'md-annotator-quick-labels'

export const LABEL_COLORS = {
  yellow:  { bg: 'rgb(235 203 139 / 18%)', text: '#ebcb8b', darkText: '#ebcb8b' },
  blue:    { bg: 'rgb(94 129 172 / 15%)',   text: '#5e81ac', darkText: '#88c0d0' },
  red:     { bg: 'rgb(191 97 106 / 12%)',   text: '#bf616a', darkText: '#bf616a' },
  green:   { bg: 'rgb(163 190 140 / 15%)',  text: '#a3be8c', darkText: '#a3be8c' },
  orange:  { bg: 'rgb(208 135 112 / 12%)',  text: '#d08770', darkText: '#d08770' },
  purple:  { bg: 'rgb(180 142 173 / 15%)',  text: '#b48ead', darkText: '#b48ead' },
  cyan:    { bg: 'rgb(136 192 208 / 15%)',  text: '#88c0d0', darkText: '#88c0d0' },
  teal:    { bg: 'rgb(143 188 187 / 15%)',  text: '#8fbcbb', darkText: '#8fbcbb' },
  pink:    { bg: 'rgb(180 142 173 / 18%)',  text: '#b48ead', darkText: '#d196d0' },
  amber:   { bg: 'rgb(235 203 139 / 22%)',  text: '#c9a227', darkText: '#ebcb8b' },
}

export const DEFAULT_LABELS = [
  { id: 'unclear',        emoji: '\u2753', text: 'Unclear',         color: 'yellow' },
  { id: 'rephrase',       emoji: '\u270F\uFE0F', text: 'Rephrase',        color: 'blue' },
  { id: 'missing-context', emoji: '\uD83D\uDCDD', text: 'Missing Context', color: 'orange' },
  { id: 'factual-error',  emoji: '\u274C', text: 'Factual Error',   color: 'red' },
  { id: 'restructure',    emoji: '\uD83D\uDD04', text: 'Restructure',     color: 'purple' },
  { id: 'expand',         emoji: '\u2795', text: 'Expand',          color: 'cyan' },
  { id: 'shorten',        emoji: '\u2796', text: 'Shorten',         color: 'teal' },
  { id: 'suggestion',     emoji: '\uD83D\uDCA1', text: 'Suggestion',      color: 'amber' },
  { id: 'good',           emoji: '\u2705', text: 'Good',            color: 'green' },
  { id: 'reference',      emoji: '\uD83D\uDD17', text: 'Reference',       color: 'pink' },
]

export function getQuickLabels() {
  try {
    const stored = getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_LABELS
}

export function getLabelColors(colorName) {
  const entry = LABEL_COLORS[colorName]
  if (!entry) { return { bg: 'rgb(94 129 172 / 15%)', text: '#5e81ac' } }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  return { bg: entry.bg, text: isDark ? entry.darkText : entry.text }
}

export function formatLabelText(label) {
  return `${label.emoji} ${label.text}`
}
