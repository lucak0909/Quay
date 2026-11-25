export interface ModelPrice {
  inputPerMTok: number
  outputPerMTok: number
  // Models that may think before answering. Thinking is billed as output and uses up the
  // answer limit, so these get extra room in the limit and in the worst-case estimate.
  thinks?: boolean
}

// USD per million tokens, standard tier, from each provider's pricing page (checked 2026-11-25).
// Where a price rise is already scheduled, the higher price is used so estimates stay on the safe side.
export const PRICES: Record<string, ModelPrice> = {
  // Anthropic. Haiku 5.5 costs more for prompts over 100,000 tokens; Quay's parts are far smaller.
  'claude-haiku-5-5': { inputPerMTok: 0.1, outputPerMTok: 0.5, thinks: true },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
  'claude-sonnet-5-5': { inputPerMTok: 2, outputPerMTok: 10, thinks: true },
  'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10, thinks: true },
  'claude-opus-5-5': { inputPerMTok: 4, outputPerMTok: 20, thinks: true },
  'claude-fable-5-2': { inputPerMTok: 8, outputPerMTok: 40, thinks: true },
  // OpenAI
  'gpt-6-luna': { inputPerMTok: 0.1, outputPerMTok: 0.5 },
  'gpt-6.1-terra': { inputPerMTok: 1, outputPerMTok: 5 },
  'gpt-6.2-sol': { inputPerMTok: 2, outputPerMTok: 10 },
  'gpt-6.2-astra': { inputPerMTok: 8, outputPerMTok: 40 },
  // Google ($0.75/$3.75 until 1 January 2027 for 3.8 Flash)
  'gemini-3.1-flash-lite': { inputPerMTok: 0.25, outputPerMTok: 1.5 },
  'gemini-3.5-flash-lite': { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  'gemini-3.8-flash': { inputPerMTok: 1.5, outputPerMTok: 7.5 },
  'gemini-4-hydrogen': { inputPerMTok: 1.5, outputPerMTok: 7.5 },
  'gemini-4-neon': { inputPerMTok: 3, outputPerMTok: 15 },
}

// Extra answer room for thinking models: enough that a little thinking never cuts the cards off.
export const THINKING_HEADROOM_TOKENS = 4000

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
