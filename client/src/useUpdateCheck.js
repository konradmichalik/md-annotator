import { useState, useEffect } from 'react'

const GITHUB_API = 'https://api.github.com/repos/konradmichalik/md-annotator/releases/latest'

function compareVersions(current, latest) {
  const clean = (v) => v.replace(/^v/, '')
  const currentParts = clean(current).split('.').map(Number)
  const latestParts = clean(latest).split('.').map(Number)

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const curr = currentParts[i] || 0
    const lat = latestParts[i] || 0
    if (lat > curr) return true
    if (lat < curr) return false
  }
  return false
}

export function useUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState(null)

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const currentVersion = typeof __APP_VERSION__ !== 'undefined'
          ? __APP_VERSION__
          : '0.0.0'

        const urlParams = new URLSearchParams(window.location.search)
        const previewVersion = urlParams.get('preview-update')

        if (previewVersion) {
          const cleanPreview = previewVersion.replace(/^v/, '')
          setUpdateInfo({
            currentVersion,
            latestVersion: previewVersion,
            updateAvailable: true,
            releaseUrl: `https://github.com/konradmichalik/md-annotator/releases/tag/v${cleanPreview}`
          })
          return
        }

        const response = await fetch(GITHUB_API)
        if (!response.ok) return

        const release = await response.json()
        const latestVersion = release.tag_name
        const updateAvailable = compareVersions(currentVersion, latestVersion)

        setUpdateInfo({
          currentVersion,
          latestVersion,
          updateAvailable,
          releaseUrl: release.html_url
        })
      } catch (_e) {
        // Silently fail — update check is not critical
      }
    }

    checkForUpdates()
  }, [])

  return updateInfo
}
