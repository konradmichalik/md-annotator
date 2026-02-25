const WORDS_PER_MINUTE = 200

export function getTextStats(text) {
  const lines = text.split('\n').length
  const words = text.split(/\s+/).filter(Boolean).length
  const readingTime = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
  return { lines, words, readingTime }
}
