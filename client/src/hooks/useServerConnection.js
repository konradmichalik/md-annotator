import { useState, useEffect, useRef } from 'react'

const MAX_FAILURES = 3

/**
 * Manages server heartbeat and automatic reconnection.
 *
 * Uses a Web Worker purely as a timer (immune to background tab throttling).
 * The actual fetch runs on the main thread to avoid Blob-URL Worker fetch issues.
 *
 * Worker ticks every 3s, main thread pings server on each tick.
 * After 3 consecutive failures the connection is declared lost.
 * Server timeout defaults to 30s (configurable via MD_ANNOTATOR_TIMEOUT).
 */
export function useServerConnection({ submitted }) {
  const [serverGone, setServerGone] = useState(false)
  // null = initial/connected, 'reconnecting' = trying, 'failed' = gave up
  const [reconnectState, setReconnectState] = useState(null)
  const failCountRef = useRef(0)

  // Web Worker as tick source — immune to background tab throttling
  useEffect(() => {
    if (serverGone || submitted) {return}
    failCountRef.current = 0

    const workerCode = `
      setInterval(() => self.postMessage('tick'), 3000)
      self.postMessage('tick')
    `
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const blobUrl = URL.createObjectURL(blob)
    const worker = new Worker(blobUrl)

    let stopped = false

    worker.onmessage = async () => {
      if (stopped) {return}
      try {
        const res = await fetch('/api/heartbeat', { method: 'POST' })
        if (!res.ok) {throw new Error('heartbeat failed')}
        failCountRef.current = 0
      } catch {
        failCountRef.current++
        if (failCountRef.current >= MAX_FAILURES) {
          stopped = true
          setServerGone(true)
        }
      }
    }

    return () => {
      stopped = true
      worker.terminate()
      URL.revokeObjectURL(blobUrl)
    }
  }, [serverGone, submitted])

  // Reconnection attempts when server disconnects
  useEffect(() => {
    if (!serverGone || submitted) {return}
    setReconnectState('reconnecting')
    let cancelled = false

    const tryReconnect = async () => {
      for (let i = 0; i < 10; i++) {
        if (cancelled) {return}
        await new Promise(r => setTimeout(r, 3000))
        if (cancelled) {return}
        try {
          const res = await fetch('/api/heartbeat', { method: 'POST' })
          if (res.ok) {
            setReconnectState(null)
            setServerGone(false)
            return
          }
        } catch {
          // Still disconnected
        }
      }
      if (!cancelled) {setReconnectState('failed')}
    }

    tryReconnect()
    return () => { cancelled = true }
  }, [serverGone, submitted])

  return { serverGone, reconnectState }
}
