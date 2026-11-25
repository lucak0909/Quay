import { db } from '../db'
import type { FolderColor } from './colors'
import { canMoveFolder, parentIn, subtreeIds } from './tree'

export async function createFolder(name: string, parentId?: string, color: FolderColor = 'slate') {
  const now = Date.now()
  const id = crypto.randomUUID()
  await db.folders.add({ id, name, color, parentId, createdAt: now, updatedAt: now })
  return id
}

export function updateFolder(id: string, changes: { name?: string; color?: FolderColor }) {
  return db.folders.update(id, { ...changes, updatedAt: Date.now() })
}

export async function moveFolder(id: string, targetId: string | undefined) {
  const folders = await db.folders.toArray()
  if (!canMoveFolder(folders, id, targetId)) return false
  await db.folders.update(id, { parentId: targetId, updatedAt: Date.now() })
  return true
}

export function moveDeck(id: string, folderId: string | undefined) {
  return db.decks.update(id, { folderId, updatedAt: Date.now() })
}

export function renameDeck(id: string, name: string) {
  return db.decks.update(id, { name, updatedAt: Date.now() })
}

export function deleteDeck(id: string) {
  return db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
    await db.cards.where('deckId').equals(id).delete()
    await db.reviews.where('deckId').equals(id).delete()
    await db.decks.delete(id)
  })
}

export async function createNote(folderId?: string) {
  const now = Date.now()
  const id = crypto.randomUUID()
  await db.notes.add({ id, name: '', content: { type: 'doc', content: [] }, text: '', folderId, createdAt: now, updatedAt: now })
  return id
}

export function moveNote(id: string, folderId: string | undefined) {
  return db.notes.update(id, { folderId, updatedAt: Date.now() })
}

export function deleteNote(id: string) {
  return db.notes.delete(id)
}

// 'keep' moves the folder's contents up one level; 'all' deletes every folder, deck, card and note inside it.
export function deleteFolder(id: string, mode: 'keep' | 'all') {
  return db.transaction('rw', [db.folders, db.decks, db.cards, db.reviews, db.notes], async () => {
    const folders = await db.folders.toArray()
    const folder = folders.find((f) => f.id === id)
    if (!folder) return
    if (mode === 'keep') {
      const parentId = parentIn(folders, folder.parentId)
      await db.folders.where('parentId').equals(id).modify({ parentId })
      await db.decks.where('folderId').equals(id).modify({ folderId: parentId })
      await db.notes.where('folderId').equals(id).modify({ folderId: parentId })
    } else {
      const ids = [...subtreeIds(folders, id)]
      const deckIds = (await db.decks.where('folderId').anyOf(ids).primaryKeys()) as string[]
      await db.cards.where('deckId').anyOf(deckIds).delete()
      await db.reviews.where('deckId').anyOf(deckIds).delete()
      await db.decks.bulkDelete(deckIds)
      await db.notes.where('folderId').anyOf(ids).delete()
      await db.folders.bulkDelete(ids.filter((f) => f !== id))
    }
    await db.folders.delete(id)
  })
}
