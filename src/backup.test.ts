import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createBackup, readBackup, restoreBackup } from './backup'
import { db } from './db'

const now = 1_795_000_000_000

async function seed() {
  await db.providers.put({ provider: 'anthropic', apiKey: 'sk-ant-secret', model: 'claude-haiku-5-5' })
  await db.folders.put({ id: 'f1', name: 'Biology', color: 'green', createdAt: now, updatedAt: now })
  await db.notes.put({ id: 'n1', name: 'Cells', folderId: 'f1', content: { type: 'doc', content: [] }, text: 'Cells', createdAt: now, updatedAt: now })
  await db.decks.put({ id: 'd1', name: 'Organelles', folderId: 'f1', createdAt: now, updatedAt: now })
  await db.cards.bulkPut([
    { id: 'c1', deckId: 'd1', front: 'Q1', back: 'A1', createdAt: now, updatedAt: now },
    { id: 'c2', deckId: 'd1', front: 'Q2', back: 'A2', createdAt: now, updatedAt: now },
  ])
  await db.reviews.add({ cardId: 'c1', deckId: 'd1', at: now, grade: 'good', mode: 'learn', prevPhase: 'new' })
  await db.appSettings.bulkPut([
    { key: 'noteBullets', value: 'false' },
    { key: 'generateDraft', value: '{"notes":"half-made cards"}' },
  ])
}

describe('backup and restore', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('backs up the whole library but never the AI key', async () => {
    await seed()
    const backup = await createBackup('0.1.0', now)
    const text = JSON.stringify(backup)
    expect(text).not.toContain('sk-ant-secret')
    expect(text).not.toContain('half-made cards')
    const { summary } = readBackup(text)
    expect(summary).toEqual({ exportedAt: now, notes: 1, decks: 1, cards: 2, folders: 1 })
  })

  it('restores the library exactly, keeping this device’s AI account', async () => {
    await seed()
    const backup = await createBackup('0.1.0', now)
    // Change everything after the backup was made.
    await db.notes.clear()
    await db.cards.put({ id: 'c3', deckId: 'd1', front: 'new', back: 'new', createdAt: now, updatedAt: now })
    await db.providers.put({ provider: 'anthropic', apiKey: 'sk-ant-newer', model: 'claude-haiku-5-5' })

    await restoreBackup(readBackup(JSON.stringify(backup)).backup)
    expect(await db.notes.count()).toBe(1)
    expect((await db.cards.toArray()).map((c) => c.id).sort()).toEqual(['c1', 'c2'])
    expect(await db.reviews.count()).toBe(1)
    expect((await db.appSettings.get('noteBullets'))?.value).toBe('false')
    expect((await db.providers.get('anthropic'))?.apiKey).toBe('sk-ant-newer')
  })

  it('refuses files that aren’t Quay backups, or come from a newer Quay', () => {
    expect(() => readBackup('not json')).toThrow(/isn't a Quay backup/)
    expect(() => readBackup(JSON.stringify({ app: 'other', tables: {} }))).toThrow(/isn't a Quay backup/)
    expect(() => readBackup(JSON.stringify({ app: 'quay', format: 99, tables: {} }))).toThrow(/newer version/)
    expect(() => readBackup(JSON.stringify({ app: 'quay', format: 1, tables: { notes: 'oops' } }))).toThrow(/damaged/)
  })
})
