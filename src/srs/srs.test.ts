import { describe, expect, it } from 'vitest'
import { answerCram, cramMastered, startCram } from './cram'
import { countDue, endOfDay, nextCard, readiness, totalDue, type StudyCard } from './queue'
import { DAY, DEFAULT_PARAMS, MINUTE, newState, pullForwardForTest, schedule, SIMPLE_GRADES, type SrsState } from './scheduler'

const NOW = new Date(2026, 10, 25, 9, 0).getTime()
const review = (interval: number, ease = 2.5, due = NOW): SrsState => ({
  phase: 'review',
  due,
  interval,
  ease,
  reps: 3,
  lapses: 0,
  step: 0,
})

describe('new and learning cards', () => {
  it('"Got it" on a new card moves to the second learning step', () => {
    const s = schedule(newState(), 'good', NOW)
    expect(s).toMatchObject({ phase: 'learning', step: 1, due: NOW + 10 * MINUTE })
  })

  it('"Got it" on the last step graduates to a one-day interval', () => {
    const s = schedule(schedule(newState(), 'good', NOW), 'good', NOW)
    expect(s).toMatchObject({ phase: 'review', interval: 1, due: NOW + DAY, reps: 1 })
  })

  it('"Forgot" goes back to the first step', () => {
    const s = schedule({ ...newState(), phase: 'learning', step: 1 }, 'again', NOW)
    expect(s).toMatchObject({ phase: 'learning', step: 0, due: NOW + MINUTE })
  })

  it('"Hard" on the first step waits the average of the first two steps', () => {
    expect(schedule(newState(), 'hard', NOW).due).toBe(NOW + 5.5 * MINUTE)
  })

  it('"Easy" graduates straight to the easy interval', () => {
    expect(schedule(newState(), 'easy', NOW)).toMatchObject({ phase: 'review', interval: 4 })
  })
})

describe('review cards', () => {
  it('"Got it" multiplies the interval by the ease', () => {
    expect(schedule(review(10), 'good', NOW)).toMatchObject({ interval: 25, due: NOW + 25 * DAY, ease: 2.5 })
  })

  it('"Hard" grows the interval slowly and lowers ease', () => {
    const s = schedule(review(10), 'hard', NOW)
    expect(s.interval).toBe(12)
    expect(s.ease).toBeCloseTo(2.35)
  })

  it('"Easy" grows more than "Got it" and raises ease', () => {
    const s = schedule(review(10), 'easy', NOW)
    expect(s.interval).toBeGreaterThan(25)
    expect(s.ease).toBeCloseTo(2.65)
  })

  it('intervals always grow by at least a day', () => {
    expect(schedule(review(1, 1.3), 'good', NOW).interval).toBeGreaterThanOrEqual(2)
  })

  it('"Forgot" on a review counts a lapse, lowers ease and starts relearning', () => {
    const s = schedule(review(30), 'again', NOW)
    expect(s).toMatchObject({ phase: 'relearning', lapses: 1, step: 0, interval: 1, due: NOW + 10 * MINUTE })
    expect(s.ease).toBeCloseTo(2.3)
  })

  it('relearning "Got it" returns to review with the reduced interval', () => {
    const lapsed = schedule(review(30), 'again', NOW)
    expect(schedule(lapsed, 'good', NOW)).toMatchObject({ phase: 'review', interval: 1 })
  })

  it('ease never drops below the minimum', () => {
    let s = review(10, 1.35)
    for (let i = 0; i < 5; i++) s = schedule(schedule(s, 'again', NOW), 'good', NOW)
    expect(s.ease).toBe(DEFAULT_PARAMS.minEase)
  })

  it('never exceeds the maximum interval', () => {
    expect(schedule(review(3000, 3), 'easy', NOW).interval).toBe(DEFAULT_PARAMS.maxInterval)
  })

  it('honours Advanced overrides', () => {
    const params = { ...DEFAULT_PARAMS, learningSteps: [5], graduatingInterval: 3 }
    expect(schedule(newState(params), 'good', NOW, params)).toMatchObject({ phase: 'review', interval: 3 })
  })
})

describe('simple two-button grading', () => {
  it('maps Forgot and Got it onto again and good', () => {
    expect(SIMPLE_GRADES).toEqual({ forgot: 'again', gotIt: 'good' })
  })
})

describe('test date cap', () => {
  const test = NOW + 10 * DAY

  it('keeps a review at most halfway to the test', () => {
    expect(schedule(review(10), 'good', NOW, DEFAULT_PARAMS, test)).toMatchObject({ interval: 5, due: NOW + 5 * DAY })
  })

  it('no card is ever due after the test date', () => {
    let s = review(1)
    let t = NOW
    while (t < test - DAY) {
      s = schedule(s, 'easy', t, DEFAULT_PARAMS, test)
      expect(s.due).toBeLessThan(test)
      t = s.due
    }
  })

  it('pulls forward cards already scheduled after the halfway point', () => {
    expect(pullForwardForTest(review(30, 2.5, NOW + 30 * DAY), NOW, test).due).toBe(NOW + 5 * DAY)
    expect(pullForwardForTest(review(2, 2.5, NOW + 2 * DAY), NOW, test).due).toBe(NOW + 2 * DAY)
    expect(pullForwardForTest(review(30, 2.5, NOW + 30 * DAY), NOW, NOW + DAY / 2).due).toBe(NOW)
  })

  it('ignores a test date in the past', () => {
    expect(schedule(review(10), 'good', NOW, DEFAULT_PARAMS, NOW - DAY).interval).toBe(25)
  })
})

const card = (id: string, srs: SrsState, createdAt = 0): StudyCard => ({ id, srs, createdAt })
const limits = { newPerDay: 2, reviewsPerDay: 10 }
const none = { newCards: 0, reviews: 0 }

describe('daily queue', () => {
  const deck = [
    card('new1', newState(), 1),
    card('new2', newState(), 2),
    card('new3', newState(), 3),
    card('review-today', review(5, 2.5, NOW - DAY)),
    card('review-tonight', review(5, 2.5, endOfDay(NOW) - 1)),
    card('review-tomorrow', review(5, 2.5, NOW + DAY)),
    card('learning-now', { ...newState(), phase: 'learning', due: NOW - MINUTE }),
    card('learning-soon', { ...newState(), phase: 'learning', due: NOW + 5 * MINUTE }),
  ]

  it('counts learning, reviews due today and new cards within the daily limit', () => {
    expect(countDue(deck, NOW, limits, none)).toEqual({ learning: 2, review: 2, new: 2 })
    expect(totalDue(countDue(deck, NOW, limits, { newCards: 2, reviews: 0 }))).toBe(4)
  })

  it('shows overdue learning cards first, then reviews, then new cards', () => {
    expect(nextCard(deck, NOW, limits, none)?.id).toBe('learning-now')
    const noLearning = deck.filter((c) => c.id !== 'learning-now')
    expect(nextCard(noLearning, NOW, limits, none)?.id).toBe('review-today')
    const onlyNew = deck.filter((c) => c.srs.phase === 'new')
    expect(nextCard(onlyNew, NOW, limits, none)?.id).toBe('new1')
  })

  it('stops introducing new cards once the daily limit is reached', () => {
    const onlyNew = deck.filter((c) => c.srs.phase === 'new')
    expect(nextCard(onlyNew, NOW, limits, { newCards: 2, reviews: 0 })).toBeUndefined()
  })

  it('shows learning cards due soon instead of ending the session', () => {
    expect(nextCard([deck[7]], NOW, limits, none)?.id).toBe('learning-soon')
  })

  it('ends when nothing is due', () => {
    expect(nextCard([deck[5]], NOW, limits, none)).toBeUndefined()
  })

  it('readiness counts graduated cards that are not due', () => {
    expect(readiness([deck[5], deck[0]], NOW)).toBe(0.5)
    expect(readiness([], NOW)).toBe(0)
  })
})

describe('cram mode', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const noShuffle = () => 0.999

  it('needs two correct answers in a row per card', () => {
    let s = startCram(['a'], 2, noShuffle)
    s = answerCram(s, true)
    expect(s.queue).toEqual(['a'])
    s = answerCram(s, true)
    expect(s.queue).toEqual([])
    expect(cramMastered(s)).toBe(1)
  })

  it('brings a missed card back within a few cards and resets its streak', () => {
    let s = startCram(ids, 2, noShuffle)
    const first = s.queue[0]
    s = answerCram(s, true)
    const back = s.queue.indexOf(first)
    s = { ...s, queue: [first, ...s.queue.filter((x) => x !== first)] }
    s = answerCram(s, false)
    expect(s.streak[first]).toBe(0)
    expect(s.queue.indexOf(first)).toBe(3)
    expect(back).toBe(6)
  })

  it('ends only when every card is mastered', () => {
    let s = startCram(ids)
    let guard = 0
    while (s.queue.length && guard++ < 1000) s = answerCram(s, guard % 3 !== 0)
    expect(s.queue).toEqual([])
    expect(cramMastered(s)).toBe(ids.length)
  })

  it('includes every card exactly once at the start', () => {
    expect([...startCram(ids).queue].sort()).toEqual(ids)
  })
})
