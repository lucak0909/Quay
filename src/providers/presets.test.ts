import { describe, expect, it } from 'vitest'
import { estimateRequest } from '../cost/estimate'
import { priceFor } from '../cost/pricing'
import { PROVIDERS } from './catalog'
import { cheapestModel, modelChoices } from './presets'

describe('model picker', () => {
  it('every listed model has a known price, and every company has a recommended one in its list', () => {
    for (const p of PROVIDERS) {
      for (const m of p.models) expect(priceFor(m.id), m.id).toBeDefined()
      expect(p.models.some((m) => m.id === p.recommended)).toBe(true)
    }
  })

  it('every model has its own description', () => {
    for (const p of PROVIDERS) {
      const abouts = p.models.map((m) => m.about)
      expect(abouts.every((a) => a.length > 10)).toBe(true)
      expect(new Set(abouts).size).toBe(abouts.length)
    }
  })

  it('lists models from cheapest to most expensive, marking both ends', () => {
    for (const p of PROVIDERS) {
      const choices = modelChoices(p)
      const costs = choices.map((c) => c.perSet)
      expect(costs).toEqual([...costs].sort((a, b) => a - b))
      expect(choices[0].cheapest && choices[0].label.includes('cheapest')).toBe(true)
      expect(choices.at(-1)!.dearest && choices.at(-1)!.label.includes('most expensive')).toBe(true)
      expect(choices.filter((c) => c.cheapest)).toHaveLength(1)
      expect(choices.filter((c) => c.dearest)).toHaveLength(1)
    }
  })

  it('labels show the cost per 10 pages and how many times the cheapest', () => {
    const anthropic = PROVIDERS.find((p) => p.id === 'anthropic')!
    const choices = modelChoices(anthropic)
    expect(choices[0].label).toMatch(/^Claude Haiku 5\.5 — about \$[\d.]+ per 10 pages · cheapest, recommended$/)
    expect(choices.at(-1)!.label).toMatch(/\(\d+× the cheapest\) · most expensive$/)
    expect(cheapestModel(anthropic)).toBe('claude-haiku-5-5')
  })

  it('gives thinking models extra answer room, and counts it in the worst case', () => {
    const plain = estimateRequest('gpt-6-luna', 'x'.repeat(3500), 10)
    const thinking = estimateRequest('claude-haiku-5-5', 'x'.repeat(3500), 10)
    expect(thinking.maxOutputTokens).toBe(plain.maxOutputTokens + 4000)
    expect(thinking.typicalOutputTokens).toBe(plain.typicalOutputTokens + 500)
  })
})
