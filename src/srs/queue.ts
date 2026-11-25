import { MINUTE, type SrsState } from './scheduler'

export interface StudyCard {
  id: string
  createdAt: number
  srs: SrsState
}

export interface DailyLimits {
  newPerDay: number
  reviewsPerDay: number
}

export const DEFAULT_LIMITS: DailyLimits = { newPerDay: 20, reviewsPerDay: 200 }

// Learning cards due within this window are shown early rather than ending the session.
export const LEARN_AHEAD = 20 * MINUTE

export interface DoneToday {
  newCards: number
  reviews: number
}

export function startOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

const isLearning = (c: StudyCard) => c.srs.phase === 'learning' || c.srs.phase === 'relearning'
const byDue = (a: StudyCard, b: StudyCard) => a.srs.due - b.srs.due

export interface DueCounts {
  learning: number
  review: number
  new: number
}

export function countDue(cards: StudyCard[], now: number, limits: DailyLimits, done: DoneToday): DueCounts {
  const learning = cards.filter((c) => isLearning(c) && c.srs.due <= now + LEARN_AHEAD).length
  const review = cards.filter((c) => c.srs.phase === 'review' && c.srs.due <= endOfDay(now)).length
  const fresh = cards.filter((c) => c.srs.phase === 'new').length
  return {
    learning,
    review: Math.min(review, Math.max(0, limits.reviewsPerDay - done.reviews)),
    new: Math.min(fresh, Math.max(0, limits.newPerDay - done.newCards)),
  }
}

export function totalDue(counts: DueCounts): number {
  return counts.learning + counts.review + counts.new
}

// Next card to show: overdue learning steps first, then today's reviews, then new cards,
// then learning cards that are due soon. Returns undefined when the day's work is done.
export function nextCard(cards: StudyCard[], now: number, limits: DailyLimits, done: DoneToday): StudyCard | undefined {
  const learningNow = cards.filter((c) => isLearning(c) && c.srs.due <= now).sort(byDue)
  if (learningNow.length) return learningNow[0]

  if (done.reviews < limits.reviewsPerDay) {
    const reviews = cards.filter((c) => c.srs.phase === 'review' && c.srs.due <= endOfDay(now)).sort(byDue)
    if (reviews.length) return reviews[0]
  }

  if (done.newCards < limits.newPerDay) {
    const fresh = cards.filter((c) => c.srs.phase === 'new').sort((a, b) => a.createdAt - b.createdAt)
    if (fresh.length) return fresh[0]
  }

  return cards.filter((c) => isLearning(c) && c.srs.due <= now + LEARN_AHEAD).sort(byDue)[0]
}

// Share of cards the student knows well: graduated and not currently due.
export function readiness(cards: StudyCard[], now: number): number {
  if (cards.length === 0) return 0
  const known = cards.filter((c) => c.srs.phase === 'review' && c.srs.due > now).length
  return known / cards.length
}
