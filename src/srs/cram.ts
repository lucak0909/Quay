// Cram mode: go through the whole deck now; missed cards come back soon, and a card is
// done once answered correctly `required` times in a row. Never touches the long-term schedule.

export interface CramSession {
  queue: string[]
  streak: Record<string, number>
  required: number
  total: number
}

const MISSED_GAP = 3
const CORRECT_GAP = 6

export function startCram(ids: string[], required = 2, random: () => number = Math.random): CramSession {
  const queue = [...ids]
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[queue[i], queue[j]] = [queue[j], queue[i]]
  }
  return { queue, streak: Object.fromEntries(ids.map((id) => [id, 0])), required, total: ids.length }
}

export function answerCram(session: CramSession, correct: boolean): CramSession {
  const [current, ...rest] = session.queue
  if (current === undefined) return session
  const streak = correct ? session.streak[current] + 1 : 0
  const next = { ...session, streak: { ...session.streak, [current]: streak } }
  if (streak >= session.required) return { ...next, queue: rest }
  const gap = Math.min(rest.length, correct ? CORRECT_GAP : MISSED_GAP)
  return { ...next, queue: [...rest.slice(0, gap), current, ...rest.slice(gap)] }
}

export function cramMastered(session: CramSession): number {
  return session.total - new Set(session.queue).size
}
