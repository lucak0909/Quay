import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Card, type Deck, type ReviewLog } from '../db'
import { countDue, DEFAULT_LIMITS, startOfDay, type DoneToday, type DueCounts, type StudyCard } from './queue'
import { newState } from './scheduler'

export function toStudyCard(card: Card): StudyCard {
  return { id: card.id, createdAt: card.createdAt, srs: card.srs ?? newState() }
}

export function doneToday(logs: ReviewLog[], now: number): DoneToday {
  const today = logs.filter((l) => l.mode === 'learn' && l.at >= startOfDay(now))
  return {
    newCards: today.filter((l) => l.prevPhase === 'new').length,
    reviews: today.filter((l) => l.prevPhase === 'review').length,
  }
}

export async function loadDeckStudy(deckId: string, now: number) {
  const [deck, cards, logs] = await Promise.all([
    db.decks.get(deckId),
    db.cards.where('deckId').equals(deckId).toArray(),
    db.reviews.where('at').aboveOrEqual(startOfDay(now)).filter((l) => l.deckId === deckId).toArray(),
  ])
  return { deck, cards, done: doneToday(logs, now) }
}

export interface DeckSummary extends Deck {
  cardCount: number
  due: DueCounts
}

// Decks with their card counts and what's due today, most recently changed first.
export function useDeckSummaries(): DeckSummary[] | undefined {
  return useLiveQuery(async () => {
    const now = Date.now()
    const [decks, cards, logs] = await Promise.all([
      db.decks.orderBy('updatedAt').reverse().toArray(),
      db.cards.toArray(),
      db.reviews.where('at').aboveOrEqual(startOfDay(now)).toArray(),
    ])
    return decks.map((deck) => {
      const deckCards = cards.filter((c) => c.deckId === deck.id)
      const deckLogs = logs.filter((l) => l.deckId === deck.id)
      return {
        ...deck,
        cardCount: deckCards.length,
        due: countDue(deckCards.map(toStudyCard), now, DEFAULT_LIMITS, doneToday(deckLogs, now)),
      }
    })
  })
}
