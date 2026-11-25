export interface ModelPrice {
  inputPerMTok: number
  outputPerMTok: number
}

// USD per million tokens, Anthropic first-party rates.
export const PRICES: Record<string, ModelPrice> = {
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
  'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10 },
}

export function priceFor(model: string): ModelPrice | undefined {
  return PRICES[model]
}

export function costUsd(price: ModelPrice, inputTokens: number, outputTokens: number): number {
  return (inputTokens * price.inputPerMTok + outputTokens * price.outputPerMTok) / 1_000_000
}

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00'
  if (amount < 0.01) return `$${amount.toFixed(4).replace(/0+$/, '')}`
  return `$${amount.toFixed(2)}`
}
