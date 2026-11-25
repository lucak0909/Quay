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

export const db = new Dexie('studykey') as Dexie & {
  providers: EntityTable<ProviderSettings, 'provider'>
  appSettings: EntityTable<AppSetting, 'key'>
}

db.version(1).stores({
  providers: 'provider',
  appSettings: 'key',
})
