import { formatUsd, typicalSetCost } from '../cost/pricing'
import type { ModelOption, ProviderInfo } from './catalog'

export interface ModelChoice extends ModelOption {
  // About what 10 pages of notes cost with this model.
  perSet: number
  // How many times the cheapest model's price, rounded (1 for the cheapest).
  times: number
  cheapest: boolean
  dearest: boolean
  recommended: boolean
  // Short label for a dropdown option.
  label: string
}

// A company's models from cheapest to most expensive, labelled so nobody needs to know model names.
export function modelChoices(provider: ProviderInfo): ModelChoice[] {
  const priced = provider.models
    .map((m) => ({ ...m, perSet: typicalSetCost(m.id) }))
    .filter((m): m is ModelOption & { perSet: number } => m.perSet !== undefined)
    .sort((a, b) => a.perSet - b.perSet)
  if (priced.length === 0) return []
  const base = priced[0].perSet
  return priced.map((m, i) => {
    const cheapest = i === 0
    const dearest = i === priced.length - 1 && priced.length > 1
    const recommended = m.id === provider.recommended
    const times = Math.max(1, Math.round(m.perSet / base))
    const tags = [cheapest && 'cheapest', recommended && 'recommended', dearest && 'most expensive'].filter(Boolean)
    const price = `about ${formatUsd(m.perSet)} per 10 pages`
    const label = `${m.name} — ${price}${times > 1 ? ` (${times}× the cheapest)` : ''}${tags.length ? ` · ${tags.join(', ')}` : ''}`
    return { ...m, perSet: m.perSet, times, cheapest, dearest, recommended, label }
  })
}

export function cheapestModel(provider: ProviderInfo): string {
  return modelChoices(provider)[0]?.id ?? provider.recommended
}
