// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { InlineMarkdown } from '../../client/src/components/Viewer/InlineMarkdown.jsx'

const render = (text) => renderToStaticMarkup(<InlineMarkdown text={text} />)

describe('InlineMarkdown links', () => {
  it('renders a plain relative link', () => {
    const html = render('[normal link](a.md)')
    expect(html).toContain('href="a.md"')
    expect(html).toContain('normal link')
  })

  it('renders a link whose text contains a bracketed token', () => {
    const html = render('[The `#[Route]` attribute](route-attribute.md)')
    expect(html).toContain('href="route-attribute.md"')
    expect(html).toContain('<code class="inline-code">#[Route]</code>')
    expect(html).not.toContain('](route-attribute.md)')
  })

  it('renders a link whose text contains an array index', () => {
    const html = render('see [items[0] handling](arrays.md) now')
    expect(html).toContain('href="arrays.md"')
    expect(html).toContain('items[0] handling')
  })

  it('still renders badge links as images', () => {
    const html = render('[![build](badge.svg)](https://example.com)')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('src="badge.svg"')
  })

  it('does not swallow the text between two adjacent links', () => {
    const html = render('[one](a.md) and [two](b.md)')
    expect(html).toContain('href="a.md"')
    expect(html).toContain('href="b.md"')
    expect(html).toContain(' and ')
  })

  it('leaves unbalanced brackets as plain text', () => {
    const html = render('a [b c d')
    expect(html).toContain('[b c d')
  })
})
