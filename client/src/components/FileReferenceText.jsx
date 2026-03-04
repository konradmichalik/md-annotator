const FILE_REF_REGEX = /(?:^|(?<=\s))@([\w./_-][\w./_-]*)/g

export function parseFileReferences(text) {
  if (!text) return null
  const parts = []
  let lastIndex = 0
  let hasRefs = false

  for (const match of text.matchAll(FILE_REF_REGEX)) {
    hasRefs = true
    const fullMatch = match[0]
    const filePath = match[1]
    const start = match.index

    if (start > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, start) })
    }
    parts.push({ type: 'ref', value: filePath })
    lastIndex = start + fullMatch.length
  }

  if (!hasRefs) return null
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return parts
}

export function FileReferenceText({ text }) {
  const parts = parseFileReferences(text)
  if (!parts) return text

  return parts.map((part, i) =>
    part.type === 'ref' ? (
      <span key={i} className="file-ref-badge">@{part.value}</span>
    ) : (
      <span key={i}>{part.value}</span>
    )
  )
}
