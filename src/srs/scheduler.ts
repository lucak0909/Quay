// SM-2 style scheduler with Anki's refinements (learning steps, relearning, hard/easy).
// Pure: takes the card's state and returns the next one. Intervals are in days.

export type Grade = 'again' | 'hard' | 'good' | 'easy'
export type Phase = 'new' | 'learning' | 'review' | 'relearning'

export interface SrsState {
  phase: Phase
  due: number
  interval: number
  ease: number
  reps: number
  lapses: number
  step: number
}

export interface SrsParams {
  learningSteps: number[]
  relearningSteps: number[]
  graduatingInterval: number
  easyInterval: number
  startingEase: number
  minEase: number
  hardMultiplier: number
  easyBonus: number
  intervalMultiplier: number
  maxInterval: number
  // Share of the old interval kept after forgetting a review card.
  lapseMultiplier: number
}

export const MINUTE = 60_000
export const DAY = 86_400_000

export const DEFAULT_PARAMS: SrsParams = {
  learningSteps: [1, 10],
  relearningSteps: [10],
  graduatingInterval: 1,
  easyInterval: 4,
  startingEase: 2.5,
  minEase: 1.3,
  hardMultiplier: 1.2,
  easyBonus: 1.3,
  intervalMultiplier: 1,
  maxInterval: 3650,
  lapseMultiplier: 0,
}

// The simple two-button mode maps onto the full four grades.
export const SIMPLE_GRADES = { forgot: 'again', gotIt: 'good' } as const satisfies Record<string, Grade>

export function newState(params: SrsParams = DEFAULT_PARAMS): SrsState {
  return { phase: 'new', due: 0, interval: 0, ease: params.startingEase, reps: 0, lapses: 0, step: 0 }
}

export function schedule(
  state: SrsState,
  grade: Grade,
  now: number,
  params: SrsParams = DEFAULT_PARAMS,
  testDate?: number,
): SrsState {
  const next =
    state.phase === 'review' ? reviewAnswer(state, grade, now, params) : learningAnswer(state, grade, now, params)
  return capForTest(next, now, testDate)
}

function learningAnswer(state: SrsState, grade: Grade, now: number, p: SrsParams): SrsState {
  const relearning = state.phase === 'relearning'
  const steps = relearning ? p.relearningSteps : p.learningSteps
  const phase: Phase = relearning ? 'relearning' : 'learning'
  const step = Math.min(state.step, Math.max(steps.length - 1, 0))

  const stay = (newStep: number, minutes: number): SrsState => ({
    ...state,
    phase,
    step: newStep,
    due: now + minutes * MINUTE,
  })
  const graduate = (interval: number): SrsState =>
    toReview({ ...state, reps: state.reps + 1 }, Math.min(interval, p.maxInterval), now)

  // After a lapse the reduced interval was stored when the card entered relearning.
  const relearnedInterval = Math.max(1, state.interval)

  if (steps.length === 0) {
    return grade === 'again' ? stay(0, 0) : graduate(relearning ? relearnedInterval : p.graduatingInterval)
  }

  switch (grade) {
    case 'again':
      return stay(0, steps[0])
    case 'hard': {
      const minutes = step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[step]
      return stay(step, minutes)
    }
    case 'good':
      if (step + 1 < steps.length) return stay(step + 1, steps[step + 1])
      return graduate(relearning ? relearnedInterval : p.graduatingInterval)
    case 'easy':
      return graduate(relearning ? relearnedInterval + 1 : p.easyInterval)
  }
}

function reviewAnswer(state: SrsState, grade: Grade, now: number, p: SrsParams): SrsState {
  const ivl = Math.max(1, state.interval)
  if (grade === 'again') {
    const lapsed: SrsState = {
      ...state,
      lapses: state.lapses + 1,
      ease: Math.max(p.minEase, state.ease - 0.2),
      interval: Math.max(1, Math.round(ivl * p.lapseMultiplier)),
      step: 0,
    }
    if (p.relearningSteps.length === 0) return toReview(lapsed, lapsed.interval, now)
    return { ...lapsed, phase: 'relearning', due: now + p.relearningSteps[0] * MINUTE }
  }

  const hardIvl = Math.max(ivl + 1, Math.round(ivl * p.hardMultiplier * p.intervalMultiplier))
  const goodIvl = Math.max(hardIvl + 1, Math.round(ivl * state.ease * p.intervalMultiplier))
  const easyIvl = Math.max(goodIvl + 1, Math.round(ivl * state.ease * p.easyBonus * p.intervalMultiplier))

  const reviewed = { ...state, reps: state.reps + 1 }
  switch (grade) {
    case 'hard':
      return toReview({ ...reviewed, ease: Math.max(p.minEase, state.ease - 0.15) }, Math.min(hardIvl, p.maxInterval), now)
    case 'good':
      return toReview(reviewed, Math.min(goodIvl, p.maxInterval), now)
    case 'easy':
      return toReview({ ...reviewed, ease: state.ease + 0.15 }, Math.min(easyIvl, p.maxInterval), now)
  }
}

function toReview(state: SrsState, interval: number, now: number): SrsState {
  return { ...state, phase: 'review', step: 0, interval, due: now + interval * DAY }
}

// When a test date is set, cards already scheduled after the halfway point are pulled forward to it.
export function pullForwardForTest(state: SrsState, now: number, testDate: number): SrsState {
  if (testDate <= now || state.phase !== 'review') return state
  const latest = now + Math.floor((testDate - now) / DAY / 2) * DAY
  return state.due > latest ? { ...state, due: latest } : state
}

// With a test coming up, a review is never pushed past the halfway point to the test,
// so every card comes up at least once more (usually twice) before it.
export function capForTest(state: SrsState, now: number, testDate?: number): SrsState {
  if (!testDate || testDate <= now || state.phase !== 'review') return state
  const maxDays = Math.max(1, Math.floor((testDate - now) / DAY / 2))
  if (state.interval <= maxDays) return state
  return { ...state, interval: maxDays, due: now + maxDays * DAY }
}
