import { useState, useEffect, useCallback } from 'react'
import { getAutoCloseDelay, setAutoCloseDelay } from '../utils/storage.js'

/**
 * Phases of the auto-close lifecycle after form submission:
 *
 * - idle:        nothing submitted yet
 * - counting:    countdown is ticking (seconds remaining in `remaining`)
 * - prompt:      auto-close is disabled; offer the user a checkbox to opt in
 * - closed:      window.close() succeeded (terminal state)
 * - closeFailed: window.close() was blocked by the browser
 */

function tryClose(onFail) {
  window.close()
  // window.close() is silently ignored when the tab wasn't opened by script.
  // Check after a short delay whether we're still alive.
  setTimeout(() => {
    if (!window.closed) {onFail()}
  }, 300)
}

export function useAutoClose(active) {
  const [state, setState] = useState({ phase: 'idle' })

  useEffect(() => {
    if (!active) {return}

    const delay = getAutoCloseDelay()
    if (delay === '0') {
      tryClose(() => setState({ phase: 'closeFailed' }))
      setState({ phase: 'closed' })
    } else if (delay !== 'off') {
      setState({ phase: 'counting', remaining: Number(delay) })
    } else {
      setState({ phase: 'prompt' })
    }
  }, [active])

  useEffect(() => {
    if (state.phase !== 'counting') {return}
    if (state.remaining <= 0) {
      tryClose(() => setState({ phase: 'closeFailed' }))
      return
    }
    const timer = setTimeout(
      () => setState(prev => prev.phase === 'counting' ? { phase: 'counting', remaining: prev.remaining - 1 } : prev),
      1000
    )
    return () => clearTimeout(timer)
  }, [state])

  const enableAndStart = useCallback(() => {
    setAutoCloseDelay('3')
    setState({ phase: 'counting', remaining: 3 })
  }, [])

  return { state, enableAndStart }
}
