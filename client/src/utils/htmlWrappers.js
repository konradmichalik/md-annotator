/**
 * Grouping and attribute helpers for balanced HTML wrappers (<details>, <div>, …).
 *
 * The parser emits a wrapper as three flat blocks (open marker, inner blocks,
 * close marker) so every inner block stays individually annotatable. Rendering
 * them flat would break elements whose semantics depend on real nesting: an
 * `innerHTML = '<details>'` is auto-closed by the browser, so the accordion
 * never contains its content. Grouping rebuilds that nesting for the renderer.
 */

import { HTML_MIXED_CONTENT_TAGS } from './parser.js'

// Attributes worth carrying over to the rendered wrapper. `style` and event
// handlers are deliberately absent (the sanitizer strips them too).
const ATTR_ALLOWLIST = new Set(['id', 'class', 'align', 'open', 'title', 'lang', 'dir'])

const BOOLEAN_ATTRS = new Set(['open'])

const ATTR_RE = /([a-zA-Z-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

export function isWrapperTag(tagName) {
  return typeof tagName === 'string' && HTML_MIXED_CONTENT_TAGS.has(tagName.toLowerCase())
}

export function parseHtmlAttributes(openTag) {
  const inner = openTag.match(/^\s*<[a-zA-Z][a-zA-Z0-9]*([^>]*)>/)?.[1]
  if (!inner) { return {} }

  const props = {}
  ATTR_RE.lastIndex = 0
  let match
  while ((match = ATTR_RE.exec(inner)) !== null) {
    const name = match[1].toLowerCase()
    if (!ATTR_ALLOWLIST.has(name)) { continue }
    const value = match[2] ?? match[3] ?? match[4]
    if (BOOLEAN_ATTRS.has(name)) {
      props[name] = value === undefined || value !== 'false'
    } else if (value !== undefined) {
      props[name === 'class' ? 'className' : name] = value
    }
  }
  return props
}

/**
 * Turns the flat block list into a shallow tree of
 * `{ kind: 'block', block }` and `{ kind: 'wrapper', block, children }` nodes.
 * Unmatched markers stay plain blocks so a malformed document still renders.
 */
export function groupHtmlWrappers(blocks) {
  const root = []
  const stack = []

  for (const block of blocks) {
    const target = stack.length > 0 ? stack[stack.length - 1].children : root

    if (block.type === 'html' && block.htmlRole === 'open' && isWrapperTag(block.htmlTag)) {
      const node = { kind: 'wrapper', block, children: [] }
      target.push(node)
      stack.push(node)
      continue
    }

    if (block.type === 'html' && block.htmlRole === 'close') {
      const openNode = stack[stack.length - 1]
      if (openNode && openNode.block.htmlTag === block.htmlTag) {
        stack.pop()
        continue
      }
    }

    target.push({ kind: 'block', block })
  }

  return root
}
