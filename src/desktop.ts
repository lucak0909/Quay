export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// In the desktop app, links to websites open in the student's normal browser
// instead of inside the Quay window.
export function openExternalLinksInBrowser() {
  if (!isDesktop) return
  document.addEventListener('click', (e) => {
    const anchor = (e.target as Element | null)?.closest?.('a[href]')
    if (!(anchor instanceof HTMLAnchorElement)) return
    const url = new URL(anchor.href, window.location.href)
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.origin === window.location.origin) return
    e.preventDefault()
    import('@tauri-apps/plugin-opener').then(({ openUrl }) => openUrl(url.href))
  })
}
