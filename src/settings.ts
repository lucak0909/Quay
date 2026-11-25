import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ProviderSettings } from './db'
import { PROVIDERS, type ProviderId } from './providers/catalog'

const DEFAULT_PROVIDER_KEY = 'defaultProvider'

export function useProviderSettings(): Record<ProviderId, ProviderSettings> | undefined {
  return useLiveQuery(async () => {
    const rows = await db.providers.toArray()
    const byId = Object.fromEntries(rows.map((r) => [r.provider, r]))
    return Object.fromEntries(
      PROVIDERS.map((p) => [p.id, byId[p.id] ?? { provider: p.id, apiKey: '', model: p.defaultModel }]),
    ) as Record<ProviderId, ProviderSettings>
  })
}

export function saveProviderSettings(settings: ProviderSettings) {
  return db.providers.put(settings)
}

export function useDefaultProvider(): ProviderId | undefined {
  return useLiveQuery(async () => {
    const row = await db.appSettings.get(DEFAULT_PROVIDER_KEY)
    return (row?.value as ProviderId | undefined) ?? 'anthropic'
  })
}

export function saveDefaultProvider(provider: ProviderId) {
  return db.appSettings.put({ key: DEFAULT_PROVIDER_KEY, value: provider })
}
