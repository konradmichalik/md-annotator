// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { HtmlWrapper, BlockRenderer } from '../../client/src/components/Viewer/BlockRenderer.jsx'

describe('HtmlWrapper', () => {
  it('renders a details wrapper around its children', () => {
    const block = { id: 'block-0', type: 'html', content: '<details>', htmlTag: 'details', htmlRole: 'open' }
    const html = renderToStaticMarkup(<HtmlWrapper block={block}><p>inner</p></HtmlWrapper>)
    expect(html).toMatch(/^<details[^>]*>/)
    expect(html).toContain('<p>inner</p>')
    expect(html).toContain('</details>')
    expect(html).toContain('data-block-id="block-0"')
  })

  it('carries allowlisted attributes over', () => {
    const block = { id: 'b', type: 'html', content: '<details open>', htmlTag: 'details', htmlRole: 'open' }
    expect(renderToStaticMarkup(<HtmlWrapper block={block} />)).toContain('open=""')
  })

  it('keeps the align attribute of a div wrapper', () => {
    const block = { id: 'b', type: 'html', content: '<div align="center">', htmlTag: 'div', htmlRole: 'open' }
    const html = renderToStaticMarkup(<HtmlWrapper block={block} />)
    expect(html).toMatch(/^<div /)
    expect(html).toContain('align="center"')
  })

  it('falls back to a div for an unknown tag', () => {
    const block = { id: 'b', type: 'html', content: '<script>', htmlTag: 'script', htmlRole: 'open' }
    expect(renderToStaticMarkup(<HtmlWrapper block={block} />)).toMatch(/^<div /)
  })
})

describe('BlockRenderer summary blocks', () => {
  it('renders a summary marker as a real summary element', () => {
    const block = { id: 'block-1', type: 'html', content: 'Click **me**', htmlTag: 'summary', htmlRole: 'summary' }
    const html = renderToStaticMarkup(<BlockRenderer block={block} />)
    expect(html).toMatch(/^<summary/)
    expect(html).toContain('data-block-id="block-1"')
    expect(html).toContain('<strong>me</strong>')
  })
})
