/**
 * Annotation color palette, matching md-annotator's Nord-derived quick-label
 * colors (client/src/utils/quickLabels.js) so both tools share one palette
 * even though this one applies to drawn shapes, not text highlights.
 */
export const ANNOTATION_COLORS = [
  { id: 'red', hex: '#bf616a' },
  { id: 'orange', hex: '#d08770' },
  { id: 'amber', hex: '#c9a227' },
  { id: 'yellow', hex: '#ebcb8b' },
  { id: 'green', hex: '#a3be8c' },
  { id: 'teal', hex: '#8fbcbb' },
  { id: 'cyan', hex: '#88c0d0' },
  { id: 'blue', hex: '#5e81ac' },
  { id: 'purple', hex: '#b48ead' },
  { id: 'pink', hex: '#d196d0' }
]

export const DEFAULT_ANNOTATION_COLOR = ANNOTATION_COLORS[0].hex
