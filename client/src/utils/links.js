/**
 * Which link targets the annotator can open in a tab of its own.
 */

const MARKDOWN_LINK_PATTERN = /\.(?:md|markdown|mdown|mkd)(?:[#?]|$)/i

// A directory target (`docs/routing/`) stands for that directory's index document
const DIRECTORY_LINK_PATTERN = /\/(?:[#?]|$)/

export function isOpenableFileLink(url) {
  if (typeof url !== 'string' || url === '') { return false }
  if (url.startsWith('#') || url.startsWith('//')) { return false }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) { return false }
  return MARKDOWN_LINK_PATTERN.test(url) || DIRECTORY_LINK_PATTERN.test(url)
}
