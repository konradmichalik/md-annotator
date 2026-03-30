/**
 * Text-based search across multiple file contents.
 * Returns results grouped by file with line numbers and context snippets.
 */

const CONTEXT_CHARS = 40

/**
 * @param {{ path: string, content: string }[]} files
 * @param {string} query
 * @returns {{ fileIndex: number, filePath: string, matches: { line: number, offset: number, context: string }[] }[]}
 */
export function searchAcrossFiles(files, query) {
  if (!query || !files?.length) { return [] }

  const lowerQuery = query.toLowerCase()
  const results = []

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex]
    const content = file.content || ''
    const lowerContent = content.toLowerCase()
    const matches = []
    let searchIdx = 0

    while ((searchIdx = lowerContent.indexOf(lowerQuery, searchIdx)) !== -1) {
      const line = content.slice(0, searchIdx).split('\n').length
      const lineStart = content.lastIndexOf('\n', searchIdx - 1) + 1
      const lineEnd = content.indexOf('\n', searchIdx)
      const lineText = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd)

      const offsetInLine = searchIdx - lineStart
      const contextStart = Math.max(0, offsetInLine - CONTEXT_CHARS)
      const contextEnd = Math.min(lineText.length, offsetInLine + query.length + CONTEXT_CHARS)
      const prefix = contextStart > 0 ? '...' : ''
      const suffix = contextEnd < lineText.length ? '...' : ''
      const context = prefix + lineText.slice(contextStart, contextEnd) + suffix

      matches.push({ line, offset: searchIdx, context })
      searchIdx += lowerQuery.length
    }

    if (matches.length > 0) {
      results.push({
        fileIndex,
        filePath: file.path,
        matches,
      })
    }
  }

  return results
}
