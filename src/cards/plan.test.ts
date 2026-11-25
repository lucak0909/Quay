import { describe, expect, it } from 'vitest'
import { cardRange, countWords, DETAIL_LEVELS, planParts, splitNotes } from './plan'

const words = (n: number, word = 'cell') => Array.from({ length: n }, () => word).join(' ')

describe('planning a card-making run', () => {
  it('more detail allows more cards for the same notes', () => {
    const ranges = DETAIL_LEVELS.map((l) => cardRange(3000, l))
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].typical).toBeGreaterThan(ranges[i - 1].typical)
      expect(ranges[i].max).toBeGreaterThan(ranges[i - 1].max)
    }
    expect(ranges.every((r) => r.max >= r.typical)).toBe(true)
  })

  it('always allows a handful of cards for short notes, and none for empty ones', () => {
    expect(cardRange(20, DETAIL_LEVELS[0])).toEqual({ typical: 1, max: 5 })
    expect(cardRange(0, DETAIL_LEVELS[4])).toEqual({ typical: 0, max: 0 })
  })

  it('keeps short notes in one part', () => {
    expect(splitNotes(words(300))).toHaveLength(1)
  })

  it('splits long notes at paragraph breaks, never over the limit', () => {
    const paragraphs = Array.from({ length: 10 }, (_, i) => words(400, `p${i}`)).join('\n\n')
    const parts = splitNotes(paragraphs, 1500)
    expect(parts.length).toBe(4)
    expect(parts.every((p) => countWords(p) <= 1500)).toBe(true)
    for (const p of parts) for (const para of p.split('\n\n')) expect(countWords(para)).toBe(400)
    expect(countWords(parts.join(' '))).toBe(4000)
  })

  it('falls back to lines, sentences and finally words for huge blocks', () => {
    expect(splitNotes(words(3200), 1500).map(countWords)).toEqual([1500, 1500, 200])
    const sentences = Array.from({ length: 30 }, () => words(99) + '.').join(' ')
    expect(splitNotes(sentences, 1500).every((p) => countWords(p) <= 1500)).toBe(true)
  })

  it('plans each part with its own card range', () => {
    const text = [words(1400, 'a'), words(1400, 'b'), words(200, 'c')].join('\n\n')
    const plan = planParts(text, DETAIL_LEVELS[2], 1500)
    expect(plan).toHaveLength(3)
    expect(plan[0].typicalCards).toBeGreaterThan(plan[2].typicalCards)
    expect(plan.every((p) => p.maxCards >= p.typicalCards)).toBe(true)
  })
})
