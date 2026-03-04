import { useRef, useEffect } from 'react'
import { parseFileReferences } from './FileReferenceText.jsx'

export function TextareaBackdrop({ value, textareaRef }) {
  const backdropRef = useRef(null)

  useEffect(() => {
    const textarea = textareaRef?.current
    const backdrop = backdropRef.current
    if (!textarea || !backdrop) return

    const syncScroll = () => {
      backdrop.scrollTop = textarea.scrollTop
      backdrop.scrollLeft = textarea.scrollLeft
    }

    textarea.addEventListener('scroll', syncScroll)
    return () => textarea.removeEventListener('scroll', syncScroll)
  }, [textareaRef])

  const parts = parseFileReferences(value)
  if (!parts) return null

  return (
    <div ref={backdropRef} className="textarea-backdrop" aria-hidden="true">
      {parts.map((part, i) =>
        part.type === 'ref'
          ? <mark key={i} className="textarea-backdrop-ref">@{part.value}</mark>
          : <span key={i}>{part.value}</span>
      )}
    </div>
  )
}
