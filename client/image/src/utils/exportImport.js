export function serializeAnnotations(annotations) {
  return JSON.stringify(annotations, null, 2)
}

export function parseAnnotationsJson(json) {
  let parsed
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid annotations JSON: could not parse the file.')
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid annotations JSON: top-level value must be an array.')
  }
  return parsed
}
