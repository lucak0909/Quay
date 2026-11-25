import type { JSONContent } from '@tiptap/react'
import Dexie, { type EntityTable } from 'dexie'
import type { ProviderId } from './providers/catalog'
import type { FolderColor } from './folders/colors'
import type { Grade, Phase, SrsState } from './srs/scheduler'

export interface ProviderSettings {
  provider: ProviderId
  apiKey: string
  model: string
}

export interface AppSetting {
  key: string
  value: string
}

export interface Deck {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  // End of the day of the student's test, if they've set one.
  testDate?: number
  // Missing for decks at the top level.
  folderId?: string
}

export interface Folder {
  id: string
  name: string
  color: FolderColor
  // Missing for folders at the top level.
  parentId?: string
  createdAt: number
  updatedAt: number
}

export interface Note {
  id: string
  name: string
  // The editor's document (Tiptap JSON).
  content: JSONContent
  // Plain text copy, for search and for making cards.
  text: string
  // Missing for notes at the top level.
  folderId?: string
  createdAt: number
  updatedAt: number
}

export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  createdAt: number
  updatedAt: number
  // Missing until the card is first studied.
  srs?: SrsState
}

export interface ReviewLog {
  id?: number
  cardId: string
  deckId: string
  at: number
  grade: Grade
  mode: 'learn' | 'cram'
  prevPhase: Phase
}

export interface SpendEntry {
  id?: number
  at: number
  month: string
  provider: ProviderId
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
  // True when the provider didn't report usage (e.g. cancelled) and the worst case was recorded.
  estimated: boolean
}

export const db = new Dexie('studykey') as Dexie & {
  providers: EntityTable<ProviderSettings, 'provider'>
  appSettings: EntityTable<AppSetting, 'key'>
  decks: EntityTable<Deck, 'id'>
  cards: EntityTable<Card, 'id'>
  spend: EntityTable<SpendEntry, 'id'>
  reviews: EntityTable<ReviewLog, 'id'>
  folders: EntityTable<Folder, 'id'>
  notes: EntityTable<Note, 'id'>
}

db.version(1).stores({
  providers: 'provider',
  appSettings: 'key',
})

db.version(2)
  .stores({
    decks: 'id, updatedAt',
    cards: 'id, deckId',
    spend: '++id, month',
  })
  .upgrade((tx) =>
    tx
      .table<ProviderSettings>('providers')
      .where('provider')
      .equals('anthropic')
      .modify((p) => {
        if (p.model === 'claude-haiku-4-5-20251001') p.model = 'claude-haiku-4-5'
      }),
  )

db.version(3).stores({
  reviews: '++id, deckId, at',
})

db.version(4).stores({
  decks: 'id, updatedAt, folderId',
  folders: 'id, parentId',
})

db.version(5).stores({
  notes: 'id, folderId, updatedAt',
})
