import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DEFAULT_LABELS,
  LABEL_COLORS,
  getQuickLabels,
  getLabelColors,
  formatLabelText,
} from '../../client/src/utils/quickLabels.js'

// Mock document with cookie support for storage.js and getLabelColors
let cookieJar = ''
vi.stubGlobal('document', {
  get cookie() { return cookieJar },
  set cookie(val) {
    const [pair] = val.split(';')
    const [name, value] = pair.split('=')
    // max-age=0 means delete
    if (val.includes('max-age=0')) {
      cookieJar = cookieJar.split('; ').filter(c => !c.startsWith(`${name}=`)).join('; ')
      return
    }
    const existing = cookieJar.split('; ').filter(c => c && !c.startsWith(`${name}=`))
    existing.push(`${name}=${value}`)
    cookieJar = existing.join('; ')
  },
  documentElement: { getAttribute: vi.fn(() => null) },
})

beforeEach(() => {
  cookieJar = ''
  vi.clearAllMocks()
})

describe('DEFAULT_LABELS', () => {
  it('has 10 default labels', () => {
    expect(DEFAULT_LABELS).toHaveLength(10)
  })

  it('each label has required fields', () => {
    for (const label of DEFAULT_LABELS) {
      expect(label).toHaveProperty('id')
      expect(label).toHaveProperty('emoji')
      expect(label).toHaveProperty('text')
      expect(label).toHaveProperty('color')
      expect(LABEL_COLORS).toHaveProperty(label.color)
    }
  })

  it('has unique ids', () => {
    const ids = DEFAULT_LABELS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getQuickLabels', () => {
  it('returns defaults when nothing stored', () => {
    expect(getQuickLabels()).toEqual(DEFAULT_LABELS)
  })

  it('returns stored labels', () => {
    const custom = [{ id: 'foo', emoji: 'X', text: 'Foo', color: 'blue' }]
    document.cookie = `md-annotator-quick-labels=${encodeURIComponent(JSON.stringify(custom))}`
    expect(getQuickLabels()).toEqual(custom)
  })

  it('falls back to defaults on invalid JSON', () => {
    document.cookie = `md-annotator-quick-labels=${encodeURIComponent('not json')}`
    expect(getQuickLabels()).toEqual(DEFAULT_LABELS)
  })

  it('falls back to defaults on empty array', () => {
    document.cookie = `md-annotator-quick-labels=${encodeURIComponent('[]')}`
    expect(getQuickLabels()).toEqual(DEFAULT_LABELS)
  })
})

describe('getLabelColors', () => {
  it('returns colors for valid color name', () => {
    const result = getLabelColors('yellow')
    expect(result).toHaveProperty('bg')
    expect(result).toHaveProperty('text')
  })

  it('returns dark text variant in dark mode', () => {
    document.documentElement.getAttribute.mockReturnValueOnce('dark')
    const result = getLabelColors('yellow')
    expect(result.text).toBe(LABEL_COLORS.yellow.darkText)
  })

  it('returns light text variant in light mode', () => {
    document.documentElement.getAttribute.mockReturnValueOnce(null)
    const result = getLabelColors('yellow')
    expect(result.text).toBe(LABEL_COLORS.yellow.text)
  })

  it('returns fallback for unknown color', () => {
    const result = getLabelColors('nonexistent')
    expect(result.bg).toBeDefined()
    expect(result.text).toBeDefined()
  })
})

describe('formatLabelText', () => {
  it('formats emoji + text', () => {
    expect(formatLabelText({ emoji: '\u2753', text: 'Unclear' })).toBe('\u2753 Unclear')
  })
})
