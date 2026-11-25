import { describe, expect, it } from 'vitest'
import { checkBudget, monthKey, monthSpend, needsExtraConfirm } from './budget'
import { estimateRequest, maxOutputTokens } from './estimate'
import { costUsd, formatUsd, PRICES } from './pricing'

describe('costUsd', () => {
  it('prices Haiku input and output separately', () => {
    expect(costUsd(PRICES['claude-haiku-4-5'], 7000, 3000)).toBeCloseTo(0.022, 6)
  })

  it('prices Sonnet 5 at twice Haiku', () => {
    expect(costUsd(PRICES['claude-sonnet-5'], 7000, 3000)).toBeCloseTo(0.044, 6)
  })
})

describe('formatUsd', () => {
  it('shows sub-cent amounts with enough precision to be non-zero', () => {
    expect(formatUsd(0.0037)).toBe('$0.0037')
    expect(formatUsd(0.25)).toBe('$0.25')
    expect(formatUsd(0)).toBe('$0.00')
    expect(formatUsd(0.004)).toBe('$0.004')
  })

  it('never renders a tiny amount as a bare "$0."', () => {
    expect(formatUsd(0.00001)).toBe('under $0.0001')
    expect(formatUsd(0.00012)).toBe('$0.00012')
  })
})

describe('estimateRequest', () => {
  it('max cost is never below typical cost', () => {
    const e = estimateRequest('claude-haiku-4-5', 'x'.repeat(20000), 20)
    expect(e.maxCost!).toBeGreaterThanOrEqual(e.typicalCost!)
    expect(e.maxOutputTokens).toBe(maxOutputTokens(20))
  })

  it('returns null costs for a model with no known price', () => {
    const e = estimateRequest('some-future-model', 'notes', 10)
    expect(e.typicalCost).toBeNull()
    expect(e.maxCost).toBeNull()
  })

  it('scales max output tokens with the card count', () => {
    expect(maxOutputTokens(30)).toBeGreaterThan(maxOutputTokens(10))
  })
})

describe('checkBudget', () => {
  it('is ok well under budget', () => {
    expect(checkBudget(1, 0.1, 5)).toBe('ok')
  })

  it('warns once the request would reach 80% of the budget', () => {
    expect(checkBudget(3.9, 0.1, 5)).toBe('warn')
  })

  it('blocks a request that would exceed the budget', () => {
    expect(checkBudget(4.95, 0.1, 5)).toBe('over')
  })

  it('blocks everything once the budget is used up', () => {
    expect(checkBudget(5, 0.0001, 5)).toBe('over')
    expect(checkBudget(5, null, 5)).toBe('over')
  })

  it('treats a zero budget as no budget', () => {
    expect(checkBudget(100, 10, 0)).toBe('ok')
  })
})

describe('needsExtraConfirm', () => {
  it('asks above the threshold or when the cost is unknown', () => {
    expect(needsExtraConfirm(0.3, 0.25)).toBe(true)
    expect(needsExtraConfirm(null, 0.25)).toBe(true)
    expect(needsExtraConfirm(0.1, 0.25)).toBe(false)
  })
})

describe('month rollover', () => {
  const entries = [
    { month: '2026-11', cost: 1.5 },
    { month: '2026-11', cost: 0.5 },
    { month: '2026-12', cost: 0.25 },
  ]

  it('only counts spend from the current month', () => {
    expect(monthSpend(entries, new Date(2026, 10, 30))).toBe(2)
    expect(monthSpend(entries, new Date(2026, 11, 1))).toBe(0.25)
  })

  it('pads single-digit months', () => {
    expect(monthKey(new Date(2027, 0, 15))).toBe('2027-01')
  })
})
