// Point the download buttons at the latest Windows installer on GitHub Releases.
// No release yet (or GitHub unreachable): say so instead of linking to a missing file.
const REPO = 'lucak0909/Quay'
const buttons = document.querySelectorAll('[data-download]')
const label = document.querySelector('[data-download-label]')
const note = document.querySelector('[data-download-note]')
const onMac = /Mac/i.test(navigator.platform) || /Mac OS X/i.test(navigator.userAgent)

function sizeLabel(bytes) {
  return bytes > 1e6 ? `${Math.round(bytes / 1e6)} MB` : `${Math.round(bytes / 1e3)} KB`
}

async function findInstaller() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) return null
  const release = await res.json()
  const exe = release.assets?.find((a) => /setup\.exe$/i.test(a.name)) ?? release.assets?.find((a) => /\.(exe|msi)$/i.test(a.name))
  return exe ? { url: exe.browser_download_url, size: exe.size, version: release.tag_name } : null
}

findInstaller()
  .then((installer) => {
    if (installer) {
      buttons.forEach((b) => b.setAttribute('href', installer.url))
      if (note) note.textContent = `Version ${installer.version.replace(/^v/, '')} · ${sizeLabel(installer.size)} · Windows 10 and 11 · Free, AGPL-3.0`
      if (onMac && label) label.textContent = 'Download for Windows (macOS coming later)'
    } else {
      buttons.forEach((b) => b.setAttribute('href', `https://github.com/${REPO}`))
      if (label) label.textContent = 'First release coming soon'
      if (note) note.textContent = 'The Windows installer will appear here with the first release. Follow along on GitHub.'
    }
  })
  .catch(() => {
    // Offline or rate-limited: fall back to the releases page.
    buttons.forEach((b) => b.setAttribute('href', `https://github.com/${REPO}/releases`))
  })
