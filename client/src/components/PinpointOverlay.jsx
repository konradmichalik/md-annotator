export function PinpointOverlay({ target }) {
  if (!target) {return null}

  const el = target.element

  return (
    <div
      className="pinpoint-overlay"
      style={{
        top: el.offsetTop,
        left: el.offsetLeft,
        width: el.offsetWidth,
        height: el.offsetHeight,
      }}
    >
      <span className="pinpoint-label">{target.label}</span>
    </div>
  )
}
