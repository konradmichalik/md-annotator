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
              <span className="file-tab-name">{name}</span>
              {count > 0 && <span className="file-tab-badge">{count}</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
