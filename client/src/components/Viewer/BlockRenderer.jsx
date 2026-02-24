import { InlineMarkdown } from './InlineMarkdown.jsx'

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function parseTableContent(content) {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) {return { headers: [], rows: [] }}

  const parseRow = (line) =>
    line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())

  const headers = parseRow(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (/^[|\-:\s]+$/.test(line)) {continue}
    rows.push(parseRow(line))
  }

  return { headers, rows }
}

export function BlockRenderer({ block }) {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level || 1}`
      return <Tag id={slugify(block.content)} className={`heading heading-${block.level || 1}`} data-block-id={block.id}><InlineMarkdown text={block.content} /></Tag>
    }

    case 'blockquote':
      return (
        <blockquote className="block-blockquote" data-block-id={block.id}>
          <InlineMarkdown text={block.content} />
        </blockquote>
      )

    case 'list-item': {
      const indent = (block.level || 0) * 1.25
      const isCheckbox = block.checked !== undefined
      const bullets = ['\u2022', '\u25E6', '\u25AA']
      const bullet = bullets[Math.min(block.level || 0, 2)]
      return (
        <div className="block-list-item" data-block-id={block.id} style={{ marginLeft: `${indent}rem` }}>
          <span className="list-marker">
            {isCheckbox
              ? (block.checked ? '\u2611' : '\u2610')
              : bullet}
          </span>
          <span className={isCheckbox && block.checked ? 'checked-text' : ''}>
            <InlineMarkdown text={block.content} />
          </span>
        </div>
      )
    }

    case 'table': {
      const { headers, rows } = parseTableContent(block.content)
      return (
        <div className="block-table-wrapper" data-block-id={block.id}>
          <table className="block-table">
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <th key={i}><InlineMarkdown text={header} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}><InlineMarkdown text={cell} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'hr':
      return <hr className="block-hr" data-block-id={block.id} />

    default:
      return (
        <p className="block-paragraph" data-block-id={block.id}>
          <InlineMarkdown text={block.content} />
        </p>
      )
  }
}
