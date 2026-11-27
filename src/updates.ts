import { isDesktop } from './desktop'

export const APP_VERSION = __APP_VERSION__

export interface AvailableUpdate {
  version: string
  // Download, install and restart. Progress is 0–1, or null while the size isn't known.
  install: (onProgress: (fraction: number | null) => void) => Promise<void>
}

// Ask GitHub Releases whether a newer version exists. Only the desktop app updates itself;
// updates are signed, and the app refuses any that aren't signed with Quay's key.
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isDesktop) return null
  const { check } = await import('@tauri-apps/plugin-updater')
  const update = await check()
  if (!update) return null
  return {
    version: update.version,
    install: async (onProgress) => {
      let total = 0
      let done = 0
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') total = event.data.contentLength ?? 0
        else if (event.event === 'Progress') {
          done += event.data.chunkLength
          onProgress(total ? Math.min(1, done / total) : null)
        } else if (event.event === 'Finished') onProgress(1)
      })
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    },
  }
}
