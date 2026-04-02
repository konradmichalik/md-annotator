export function FileTabsBar({ files, activeFileIndex, onSelectFile }) {
  if (files.length <= 1) {return null}

  return (
    <nav className="file-tabs-bar" role="tablist">
      <div className="file-tabs-scroll">
        {files.map((file, index) => {
          const name = file.path.split(/[\\/]/).pop()
          const count = file.annState.annotations.length
          const isActive = index === activeFileIndex
          return (
            <button
              key={file.path}
              role="tab"
              aria-selected={isActive}
              className={`file-tab${isActive ? ' file-tab--active' : ''}`}
              onClick={() => onSelectFile(index)}
              title={file.path}
            >
              {file.reviewed && (
                <span className="file-tab-reviewed" aria-label="Reviewed" title="Reviewed">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
              <span className="file-tab-name">{name}</span>
              {count > 0 && <span className="file-tab-badge">{count}</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
