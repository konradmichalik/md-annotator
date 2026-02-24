/**
 * Cookie-based storage utility.
 *
 * Uses cookies instead of localStorage so settings persist across
 * different ports (each session uses a random port).
 * Cookies are scoped by domain, not port, so localhost:54321 and
 * localhost:54322 share the same cookies.
 */

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getItem(key) {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapeRegex(key)}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

function setItem(key, value) {
  try {
    const encoded = encodeURIComponent(value)
    document.cookie = `${key}=${encoded}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
  } catch {
    // Cookie not available
  }
}

const AUTO_CLOSE_KEY = 'md-annotator-auto-close'

export function getAutoCloseDelay() {
  const val = getItem(AUTO_CLOSE_KEY)
  if (val === '0' || val === '3' || val === '5') {return val}
  return 'off'
}

export function setAutoCloseDelay(delay) {
  setItem(AUTO_CLOSE_KEY, delay)
}
