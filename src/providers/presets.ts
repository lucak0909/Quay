import { formatUsd, typicalSetCost } from '../cost/pricing'
import type { ProviderInfo, QualityPreset } from './catalog'

export function presetBlurb(provider: ProviderInfo, preset: QualityPreset): string {
  const cost = typicalSetCost(preset.model)
  if (cost === undefined) return ''
  const perSet = `About ${formatUsd(cost)} for 10 pages of notes.`
  if (preset.id === 'cheapest') return perSet
  const base = typicalSetCost(provider.presets[0].model)
  const ratio = base ? Math.round(cost / base) : 0
  return `Better at tricky or technical material. ${perSet}${ratio > 1 ? ` (about ${ratio}× the cheapest)` : ''}`
}
