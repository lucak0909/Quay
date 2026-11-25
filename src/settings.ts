import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_CONFIRM_THRESHOLD, DEFAULT_MONTHLY_BUDGET } from './cost/budget'
import { db, type ProviderSettings } from './db'
import { defaultModel, providerInfo, PROVIDERS, type ProviderId, type ProviderInfo } from './providers/catalog'

export function useProviderSettings(): Record<ProviderId, ProviderSettings> | undefined {
  return useLiveQuery(async () => {
    const rows = await db.providers.toArray()
    const byId = Object.fromEntries(rows.map((r) => [r.provider, r]))
    return Object.fromEntries(
      PROVIDERS.map((p) => [p.id, byId[p.id] ?? { provider: p.id, apiKey: '', model: defaultModel(p.id) }]),
    ) as Record<ProviderId, ProviderSettings>
  })
}

export function saveProviderSettings(settings: ProviderSettings) {
  return db.providers.put(settings)
}

export interface ActiveProvider {
  info: ProviderInfo
  settings: ProviderSettings
}

const ACTIVE_KEY = 'activeProvider'

// null means no AI account is connected yet; undefined means still loading.
export function useActiveProvider(): ActiveProvider | null | undefined {
  return useLiveQuery(async () => {
    const [row, rows] = await Promise.all([db.appSettings.get(ACTIVE_KEY), db.providers.toArray()])
    const connected = rows.filter((r) => r.apiKey)
    const chosen = connected.find((r) => r.provider === row?.value) ?? connected[0]
    return chosen ? { info: providerInfo(chosen.provider), settings: chosen } : null
  })
}

export function setActiveProvider(id: ProviderId) {
  return db.appSettings.put({ key: ACTIVE_KEY, value: id })
}

export interface Limits {
  monthlyBudget: number
  confirmThreshold: number
}

export function useLimits(): Limits | undefined {
  return useLiveQuery(async () => {
    const [budget, threshold] = await db.appSettings.bulkGet(['monthlyBudget', 'confirmThreshold'])
    return {
      monthlyBudget: budget ? Number(budget.value) : DEFAULT_MONTHLY_BUDGET,
      confirmThreshold: threshold ? Number(threshold.value) : DEFAULT_CONFIRM_THRESHOLD,
    }
  })
}

export function saveLimits(limits: Limits) {
  return db.appSettings.bulkPut([
    { key: 'monthlyBudget', value: String(limits.monthlyBudget) },
    { key: 'confirmThreshold', value: String(limits.confirmThreshold) },
  ])
}
