import { useState, useEffect } from 'react'

export function getResolvedTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light'
}

export function useResolvedTheme() {
  const [resolved, setResolved] = useState(getResolvedTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setResolved(getResolvedTheme())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return resolved
}
