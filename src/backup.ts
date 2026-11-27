import { db } from './db'

// A backup is one JSON file with everything in the student's library. AI keys are left out on purpose:
// backup files get copied around (USB sticks, cloud folders, emails), and a key in one could be misused.

const TABLES = ['folders', 'notes', 'decks', 'cards', 'reviews', 'spend', 'appSettings'] as const
type TableName = (typeof TABLES)[number]
// Settings that only make sense on this device right now.
const SKIP_SETTINGS = new Set(['generateDraft'])

export const BACKUP_FORMAT = 1

export interface Backup {
  app: 'quay'
  format: number
  appVersion: string
  exportedAt: number
  tables: Record<TableName, unknown[]>
}

export async function createBackup(appVersion: string, now = Date.now()): Promise<Backup> {
  const tables = {} as Record<TableName, unknown[]>
  await db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) tables[name] = await db.table(name).toArray()
  })
  tables.appSettings = (tables.appSettings as { key: string }[]).filter((s) => !SKIP_SETTINGS.has(s.key))
  return { app: 'quay', format: BACKUP_FORMAT, appVersion, exportedAt: now, tables }
}

export interface BackupSummary {
  exportedAt: number
  notes: number
  decks: number
  cards: number
  folders: number
}

// Check a file really is a Quay backup before anything is replaced.
export function readBackup(text: string): { backup: Backup; summary: BackupSummary } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("This file isn't a Quay backup.")
  }
  const b = data as Partial<Backup>
  if (!b || b.app !== 'quay' || typeof b.tables !== 'object' || b.tables === null) throw new Error("This file isn't a Quay backup.")
  if (typeof b.format !== 'number' || b.format > BACKUP_FORMAT) {
    throw new Error('This backup was made by a newer version of Quay. Update Quay, then try again.')
  }
  for (const name of TABLES) {
    const rows = (b.tables as Record<string, unknown>)[name]
    if (rows !== undefined && !Array.isArray(rows)) throw new Error('This backup is damaged and can’t be restored.')
  }
  const count = (name: TableName) => ((b.tables as Record<string, unknown[]>)[name] ?? []).length
  return {
    backup: b as Backup,
    summary: { exportedAt: b.exportedAt ?? 0, notes: count('notes'), decks: count('decks'), cards: count('cards'), folders: count('folders') },
  }
}

// Replace the library on this device with the backup, all at once. The AI account (key) is kept.
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) {
      const rows = (backup.tables[name] ?? []) as Record<string, unknown>[]
      const table = db.table(name)
      if (name === 'appSettings') {
        // Keep this device's own settings that backups don't carry.
        const keep = (await table.toArray()).filter((s: { key: string }) => SKIP_SETTINGS.has(s.key))
        await table.clear()
        await table.bulkPut([...rows, ...keep])
      } else {
        await table.clear()
        await table.bulkPut(rows)
      }
    }
  })
}

export function backupFileName(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `quay-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

// Save the backup file: a proper "Save as" window where the browser or desktop app supports it,
// otherwise a normal download.
export async function saveBackupFile(backup: Backup): Promise<'saved' | 'cancelled'> {
  const text = JSON.stringify(backup)
  const name = backupFileName()
  const picker = (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker
  if (picker) {
    try {
      const handle = await picker({ suggestedName: name, types: [{ description: 'Quay backup', accept: { 'application/json': ['.json'] } }] })
      const writable = await handle.createWritable()
      await writable.write(text)
      await writable.close()
      return 'saved'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      throw e
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'saved'
}
