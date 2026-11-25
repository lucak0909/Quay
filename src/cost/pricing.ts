export interface ModelPrice {
  inputPerMTok: number
  outputPerMTok: number
}

// USD per million tokens, standard tier, from each provider's pricing page (checked 2026-11-25).
export const PRICES: Record<string, ModelPrice> = {
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
  'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10 },
  'gpt-6-luna': { inputPerMTok: 0.1, outputPerMTok: 0.5 },
  'gpt-6.1-terra': { inputPerMTok: 1, outputPerMTok: 5 },
  'gemini-3.5-flash-lite': { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  // Google lists $0.75/$3.75 until a scheduled increase; the higher price keeps estimates on the safe side.
  'gemini-3.8-flash': { inputPerMTok: 1.5, outputPerMTok: 7.5 },
}

// A typical set of notes: about 10 pages in, 30 cards out.
export const TYPICAL_SET = { inputTokens: 7000, outputTokens: 3000 }

export function priceFor(model: string): ModelPrice | undefined {
  return PRICES[model]
}

export function costUsd(price: ModelPrice, inputTokens: number, outputTokens: number): number {
  return (inputTokens * price.inputPerMTok + outputTokens * price.outputPerMTok) / 1_000_000
}

export function typicalSetCost(model: string): number | undefined {
  const price = priceFor(model)
  return price ? costUsd(price, TYPICAL_SET.inputTokens, TYPICAL_SET.outputTokens) : undefined
}

// Cheapest and dearest "cheapest setting" across the given models, for neutral price ranges.
export function costRange(models: string[], inputTokens: number, outputTokens: number): [number, number] {
  const costs = models.flatMap((m) => {
    const price = priceFor(m)
    return price ? [costUsd(price, inputTokens, outputTokens)] : []
  })
  return [Math.min(...costs), Math.max(...costs)]
}

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00'
  if (amount < 0.0001) return 'under $0.0001'
  if (amount < 0.01) return `$${Number(amount.toPrecision(2))}`
  return `$${amount.toFixed(2)}`
}
