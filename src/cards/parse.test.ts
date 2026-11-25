import { describe, expect, it } from 'vitest'
import { parseCards } from './parse'

const card = (front: string, back: string) => ({ front, back })

describe('parseCards', () => {
  it('parses well-formed structured output', () => {
    const text = JSON.stringify({ cards: [card('Q1', 'A1'), card('Q2', 'A2')] })
    expect(parseCards(text)).toEqual({ cards: [card('Q1', 'A1'), card('Q2', 'A2')], rejected: [], salvaged: false })
  })

  it('accepts a bare array', () => {
    expect(parseCards(JSON.stringify([card('Q', 'A')])).cards).toEqual([card('Q', 'A')])
  })

  it('ignores prose and code fences around the JSON', () => {
    const text = 'Here are your cards:\n```json\n' + JSON.stringify({ cards: [card('Q', 'A')] }) + '\n```\nGood luck!'
    expect(parseCards(text).cards).toEqual([card('Q', 'A')])
  })

  it('salvages complete cards from truncated output', () => {
    const text = '{"cards":[{"front":"Q1","back":"A1"},{"front":"Q2","back":"A2"},{"front":"Q3","ba'
    const result = parseCards(text)
    expect(result.cards).toEqual([card('Q1', 'A1'), card('Q2', 'A2')])
    expect(result.salvaged).toBe(true)
  })

  it('keeps braces and quotes inside strings intact', () => {
    const text = '{"cards":[{"front":"What does {x} mean?","back":"A \\"set\\" with x"},{"front":"Q2"'
    expect(parseCards(text).cards).toEqual([card('What does {x} mean?', 'A "set" with x')])
  })

  it('reports cards missing a side instead of dropping them', () => {
    const text = JSON.stringify({ cards: [card('Q1', 'A1'), { front: 'Q2' }, { back: 'A3' }] })
    const result = parseCards(text)
    expect(result.cards).toEqual([card('Q1', 'A1')])
    expect(result.rejected).toEqual([
      { front: 'Q2', back: '', reason: 'Missing answer' },
      { front: '', back: 'A3', reason: 'Missing question' },
    ])
  })

  it('trims whitespace and skips empty cards', () => {
    const text = JSON.stringify({ cards: [card('  Q  ', ' A '), card('', '')] })
    expect(parseCards(text)).toEqual({ cards: [card('Q', 'A')], rejected: [], salvaged: false })
  })

  it('returns nothing for text with no cards', () => {
    expect(parseCards('Sorry, I cannot help with that.')).toEqual({ cards: [], rejected: [], salvaged: true })
  })
})
