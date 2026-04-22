import DOMPurify from 'dompurify'

const HTML_CONFIG = {
  FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onsubmit', 'onreset', 'onchange', 'oninput'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
}

const SVG_CONFIG = {
  USE_PROFILES: { svg: true },
  FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
}

export function sanitizeHTML(dirty) {
  return DOMPurify.sanitize(dirty, HTML_CONFIG)
}

export function sanitizeSVG(dirty) {
  return DOMPurify.sanitize(dirty, SVG_CONFIG)
}
