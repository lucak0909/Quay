import { costUsd, priceFor } from './pricing'

// Deliberately pessimistic so estimates err high.
const CHARS_PER_TOKEN = 3.5
// System prompt plus the structured-output schema the API adds.
const REQUEST_OVERHEAD_TOKENS = 400
const TYPICAL_OUTPUT_TOKENS_PER_CARD = 60
const MAX_OUTPUT_TOKENS_PER_CARD = 150
const OUTPUT_OVERHEAD_TOKENS = 50

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export function maxOutputTokens(cardCount: number): number {
  return OUTPUT_OVERHEAD_TOKENS + cardCount * MAX_OUTPUT_TOKENS_PER_CARD
}

export interface RequestEstimate {
  inputTokens: number
  typicalOutputTokens: number
  maxOutputTokens: number
  // null when the model has no known price.
  typicalCost: number | null
  maxCost: number | null
}

export function estimateRequest(model: string, promptText: string, cardCount: number): RequestEstimate {
  const inputTokens = estimateTokens(promptText) + REQUEST_OVERHEAD_TOKENS
  const typicalOutputTokens = OUTPUT_OVERHEAD_TOKENS + cardCount * TYPICAL_OUTPUT_TOKENS_PER_CARD
  const maxOut = maxOutputTokens(cardCount)
  const price = priceFor(model)
  return {
    inputTokens,
    typicalOutputTokens,
    maxOutputTokens: maxOut,
    typicalCost: price ? costUsd(price, inputTokens, typicalOutputTokens) : null,
    maxCost: price ? costUsd(price, inputTokens, maxOut) : null,
  }
}
