import Dexie, { type EntityTable } from 'dexie'
import type { ProviderId } from './providers/catalog'

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
}

export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  createdAt: number
  updatedAt: number
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
