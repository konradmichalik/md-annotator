import DOMPurify from 'dompurify'
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

function NoteBorder({ blockId, onClick }) {
  return (
    <span
      className="block-note-border"
      onClick={(e) => { e.stopPropagation(); onClick(blockId) }}
      title="AI Note — click to view"
      role="button"
      tabIndex={-1}
      aria-label="View AI note"
    />
  )
}

export function BlockRenderer({ block, onImageClick, annotatedImages, hasNote, onNoteClick }) {
  const noteClass = hasNote ? ' block-has-note' : ''

  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level || 1}`
      return (
        <Tag id={slugify(block.content)} className={`heading heading-${block.level || 1}${noteClass}`} data-block-id={block.id}>
          {hasNote && <NoteBorder blockId={block.id} onClick={onNoteClick} />}
          <InlineMarkdown text={block.content} onImageClick={onImageClick} annotatedImages={annotatedImages} blockId={block.id} />
        </Tag>
      )
    }

    case 'blockquote':
      return (
        <blockquote className={`block-blockquote${noteClass}`} data-block-id={block.id}>
          {hasNote && <NoteBorder blockId={block.id} onClick={onNoteClick} />}
          <InlineMarkdown text={block.content} onImageClick={onImageClick} annotatedImages={annotatedImages} blockId={block.id} />
        </blockquote>
      )

    case 'list-item': {
      const indent = (block.level || 0) * 1.25
      const isCheckbox = block.checked !== undefined
      const bullets = ['\u2022', '\u25E6', '\u25AA']
      const bullet = bullets[Math.min(block.level || 0, 2)]
      return (
        <div className={`block-list-item${noteClass}`} data-block-id={block.id} style={{ marginLeft: `${indent}rem` }}>
          {hasNote && <NoteBorder blockId={block.id} onClick={onNoteClick} />}
          <span className="list-marker">
            {isCheckbox
              ? (block.checked ? '\u2611' : '\u2610')
              : bullet}
          </span>
          <span className={isCheckbox && block.checked ? 'checked-text' : ''}>
            <InlineMarkdown text={block.content} onImageClick={onImageClick} annotatedImages={annotatedImages} blockId={block.id} />
          </span>
        </div>
      )
    }

    case 'table': {
      const { headers, rows } = parseTableContent(block.content)
      return (
        <div className={`block-table-wrapper${noteClass}`} data-block-id={block.id}>
          {hasNote && <NoteBorder blockId={block.id} onClick={onNoteClick} />}
          <table className="block-table">
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <th key={i}><InlineMarkdown text={header} onImageClick={onImageClick} annotatedImages={annotatedImages} blockId={block.id} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}><InlineMarkdown text={cell} onImageClick={onImageClick} annotatedImages={annotatedImages} blockId={block.id} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'html':
      return (
        <div
          className={`block-html${noteClass}`}
          data-block-id={block.id}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(block.content)
          }}
        />
      )

    case 'hr':
      return <hr className={`block-hr${noteClass}`} data-block-id={block.id} />

    default:
      return (
        <p className={`block-paragraph${noteClass}`} data-block-id={block.id}>
          {hasNote && <NoteBorder blockId={block.id} onClick={onNoteClick} />}
          <InlineMarkdown text={block.content} onImageClick={onImageClick} annotatedImages={annotatedImages} blockId={block.id} />
        </p>
      )
  }
}
