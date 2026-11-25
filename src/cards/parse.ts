import type { CardDraft, RejectedCard } from './schema'

export interface ParsedCards {
  cards: CardDraft[]
  rejected: RejectedCard[]
  // True when the text wasn't complete JSON and cards were salvaged from it.
  salvaged: boolean
}

export function parseCards(text: string): ParsedCards {
  const whole = tryParseWhole(text)
  if (whole !== undefined) {
    const items = Array.isArray(whole) ? whole : isRecord(whole) && Array.isArray(whole.cards) ? whole.cards : null
    if (items) return { ...validate(items), salvaged: false }
  }
  return { ...validate(scanObjects(text)), salvaged: true }
}

function tryParseWhole(text: string): unknown {
  const attempts = [text.trim()]
  const start = text.search(/[[{]/)
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
  if (start !== -1 && end > start) attempts.push(text.slice(start, end + 1))
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt)
    } catch {
      // try the next candidate
    }
  }
  return undefined
}

// Collects every complete innermost object (one containing no other object),
// which is what each card is. Recovers cards from truncated or wrapped output.
function scanObjects(text: string): unknown[] {
  const found: unknown[] = []
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') start = i
    else if (ch === '}' && start !== -1) {
      try {
        found.push(JSON.parse(text.slice(start, i + 1)))
      } catch {
        // skip malformed fragment
      }
      start = -1
    }
  }
  return found
}

function validate(items: unknown[]): Omit<ParsedCards, 'salvaged'> {
  const cards: CardDraft[] = []
  const rejected: RejectedCard[] = []
  for (const item of items) {
    const front = isRecord(item) && typeof item.front === 'string' ? item.front.trim() : ''
    const back = isRecord(item) && typeof item.back === 'string' ? item.back.trim() : ''
    if (front && back) cards.push({ front, back })
    else if (front || back) rejected.push({ front, back, reason: front ? 'Missing answer' : 'Missing question' })
  }
  return { cards, rejected }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
