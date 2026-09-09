import { useState, useCallback, useEffect } from 'react'

function escapeCSVField(field) {
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function tableToMarkdown(headers, rows) {
  const headerLine = '| ' + headers.join(' | ') + ' |'
  const separatorLine = '| ' + headers.map(() => '---').join(' | ') + ' |'
  const rowLines = rows.map(row => '| ' + row.join(' | ') + ' |')
  return [headerLine, separatorLine, ...rowLines].join('\n')
}

function tableToCSV(headers, rows) {
  const lines = [headers, ...rows].map(row => row.map(escapeCSVField).join(','))
  return lines.join('\n')
}

export function TableToolbar({ headers, rows, onAnnotate }) {
  const [popoutOpen, setPopoutOpen] = useState(false)
  const [copied, setCopied] = useState(null)

  const copyMarkdown = useCallback(async () => {
    await navigator.clipboard.writeText(tableToMarkdown(headers, rows))
    setCopied('md')
    setTimeout(() => setCopied(null), 2000)
  }, [headers, rows])

  const copyCSV = useCallback(async () => {
    await navigator.clipboard.writeText(tableToCSV(headers, rows))
    setCopied('csv')
    setTimeout(() => setCopied(null), 2000)
  }, [headers, rows])

  useEffect(() => {
    if (!popoutOpen) { return }
    const handler = (e) => {
      if (e.key === 'Escape') { setPopoutOpen(false) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [popoutOpen])

  return (
    <>
      <div className="table-toolbar" role="toolbar" aria-label="Table actions">
        {onAnnotate && (
          <button type="button" className="table-toolbar-btn table-toolbar-btn--annotate" onClick={onAnnotate} title="Annotate table" aria-label="Annotate entire table">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M11.93 1.525a1.86 1.86 0 012.631 2.631l-7.964 7.964-3.496.874.874-3.496 7.955-7.973zm-1.06 2.12L4.575 9.94l-.467 1.869 1.869-.467 6.296-6.296-1.404-1.403z" />
            </svg>
          </button>
        )}
        <button type="button" className="table-toolbar-btn" onClick={() => setPopoutOpen(true)} title="Open in overlay" aria-label="Open table in overlay">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M2 4.25A2.25 2.25 0 014.25 2h7.5A2.25 2.25 0 0114 4.25v7.5A2.25 2.25 0 0111.75 14h-7.5A2.25 2.25 0 012 11.75v-7.5zM4.25 3.5a.75.75 0 00-.75.75v7.5c0 .414.336.75.75.75h7.5a.75.75 0 00.75-.75v-7.5a.75.75 0 00-.75-.75h-7.5z" />
            <path d="M5 6.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 015 6.25zM5.75 9a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z" />
          </svg>
        </button>
        <button type="button" className="table-toolbar-btn" onClick={copyMarkdown} title="Copy as Markdown" aria-label="Copy table as Markdown">
          {copied === 'md' ? '\u2713' : 'MD'}
        </button>
        <button type="button" className="table-toolbar-btn" onClick={copyCSV} title="Copy as CSV" aria-label="Copy table as CSV">
          {copied === 'csv' ? '\u2713' : 'CSV'}
        </button>
      </div>

      {popoutOpen && (
        <div className="table-popout-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setPopoutOpen(false) } }}>
          <div className="table-popout-content" role="dialog" aria-label="Table popout">
            <div className="table-popout-header">
              <span className="table-popout-title">Table</span>
              <button type="button" className="table-popout-close" onClick={() => setPopoutOpen(false)} aria-label="Close overlay">{'\u2715'}</button>
            </div>
            <div className="table-popout-body">
              <table className="block-table">
                <thead>
                  <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
