import { useState, useEffect, useRef } from 'react'

const MAX_FAILURES = 3
const HEARTBEAT_INTERVAL_MS = 3000
const HEARTBEAT_FETCH_TIMEOUT_MS = 5000

function pingHeartbeat(signal) {
  return fetch('/api/heartbeat', { method: 'POST', signal, cache: 'no-store' })
}

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
      setInterval(() => self.postMessage('tick'), ${HEARTBEAT_INTERVAL_MS})
      self.postMessage('tick')
    `
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const blobUrl = URL.createObjectURL(blob)
    const worker = new Worker(blobUrl)

    let stopped = false
    let abortController = null

    worker.onmessage = async () => {
      if (stopped) {return}
      abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), HEARTBEAT_FETCH_TIMEOUT_MS)
      try {
        const res = await pingHeartbeat(abortController.signal)
        clearTimeout(timeoutId)
        if (stopped) {return}
        if (!res.ok) {throw new Error('heartbeat failed')}
        failCountRef.current = 0
      } catch {
        clearTimeout(timeoutId)
        if (stopped) {return}
        failCountRef.current++
        if (failCountRef.current >= MAX_FAILURES) {
          stopped = true
          setServerGone(true)
        }
      }
    }

    return () => {
      stopped = true
      if (abortController) {abortController.abort()}
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
        await new Promise(r => setTimeout(r, HEARTBEAT_INTERVAL_MS))
        if (cancelled) {return}
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), HEARTBEAT_FETCH_TIMEOUT_MS)
        try {
          const res = await pingHeartbeat(controller.signal)
          clearTimeout(timeoutId)
          if (cancelled) {return}
          if (res.ok) {
            setReconnectState(null)
            setServerGone(false)
            return
          }
        } catch {
          clearTimeout(timeoutId)
          if (cancelled) {return}
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
