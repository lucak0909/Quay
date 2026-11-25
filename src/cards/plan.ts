// Planning a card-making run. The student picks how detailed the cards should be;
// the AI decides how many that takes for their notes. Long notes are sent in parts,
// each its own request, so no answer is long enough to hit the AI's output limit and
// every part of the text gets covered instead of the end being skimmed.

export interface DetailLevel {
  label: string
  instruction: string
  // Rough words of notes per card, used only for cost estimates and as a hard cap.
  typicalWordsPerCard: number
  minWordsPerCard: number
}

export const DETAIL_LEVELS: DetailLevel[] = [
  {
    label: 'Key ideas',
    instruction: 'Only the most important ideas: what would definitely come up in a test. Skip supporting detail and examples.',
    typicalWordsPerCard: 300,
    minWordsPerCard: 150,
  },
  {
    label: 'Main points',
    instruction: 'The main point of each section, without minor details.',
    typicalWordsPerCard: 160,
    minWordsPerCard: 80,
  },
  {
    label: 'Balanced',
    instruction:
      'Every main point, plus the supporting details worth remembering: key definitions, numbers, causes and effects.',
    typicalWordsPerCard: 90,
    minWordsPerCard: 45,
  },
  {
    label: 'Thorough',
    instruction: 'Nearly every fact, definition, process step and example worth remembering.',
    typicalWordsPerCard: 55,
    minWordsPerCard: 28,
  },
  {
    label: 'Everything',
    instruction: 'Every testable fact in the notes, however small. Split big ideas into several small cards.',
    typicalWordsPerCard: 35,
    minWordsPerCard: 18,
  },
]

export const DEFAULT_DETAIL = 2
export const MAX_WORDS_PER_PART = 1500

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

// Roughly how many cards a level gives for this much text, and the most it may give.
export function cardRange(words: number, level: DetailLevel): { typical: number; max: number } {
  if (words === 0) return { typical: 0, max: 0 }
  return {
    typical: Math.max(1, Math.round(words / level.typicalWordsPerCard)),
    max: Math.max(5, Math.ceil(words / level.minWordsPerCard)),
  }
}

// Split at blank lines, then single lines, then sentences, so a part never cuts a thought in half
// unless one sentence is longer than a whole part.
export function splitNotes(text: string, maxWords = MAX_WORDS_PER_PART): string[] {
  const pieces = (t: string, level: number): string[] => {
    if (countWords(t) <= maxWords) return [t]
    const separators = [/\n\s*\n/, /\n/, /(?<=[.!?])\s+/]
    if (level >= separators.length) {
      const words = t.trim().split(/\s+/)
      const out: string[] = []
      for (let i = 0; i < words.length; i += maxWords) out.push(words.slice(i, i + maxWords).join(' '))
      return out
    }
    return t.split(separators[level]).flatMap((p) => pieces(p, level + 1))
  }
  const parts: string[] = []
  let current = ''
  for (const piece of pieces(text, 0).map((p) => p.trim()).filter(Boolean)) {
    const candidate = current ? `${current}\n\n${piece}` : piece
    if (current && countWords(candidate) > maxWords) {
      parts.push(current)
      current = piece
    } else {
      current = candidate
    }
  }
  if (current) parts.push(current)
  return parts
}

export interface Part {
  text: string
  typicalCards: number
  maxCards: number
}

export function planParts(text: string, level: DetailLevel, maxWords = MAX_WORDS_PER_PART): Part[] {
  return splitNotes(text, maxWords).map((t) => {
    const range = cardRange(countWords(t), level)
    return { text: t, typicalCards: range.typical, maxCards: range.max }
  })
}
