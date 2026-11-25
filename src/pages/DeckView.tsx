import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { db } from '../db'
import { countDue, DEFAULT_LIMITS, endOfDay, readiness, startOfDay, totalDue } from '../srs/queue'
import { pullForwardForTest } from '../srs/scheduler'
import { doneToday, toStudyCard } from '../srs/store'
import { btn, btnDanger, btnSecondary, input, link, muted, panel } from '../ui'

function setTestDate(deckId: string, testDate: number) {
  const now = Date.now()
  return db.transaction('rw', db.decks, db.cards, async () => {
    await db.decks.update(deckId, { testDate })
    await db.cards
      .where('deckId')
      .equals(deckId)
      .modify((card) => {
        if (card.srs) card.srs = pullForwardForTest(card.srs, now, testDate)
      })
  })
}

function toDateInput(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DeckView() {
  const { id = '' } = useParams()
  const data = useLiveQuery(async () => {
    const now = Date.now()
    const [deck, cards, logs] = await Promise.all([
      db.decks.get(id),
      db.cards.where('deckId').equals(id).sortBy('createdAt'),
      db.reviews.where('at').aboveOrEqual(startOfDay(now)).filter((l) => l.deckId === id).toArray(),
    ])
    return { deck: deck ?? null, cards, logs, now }
  }, [id])

  if (!data) return null
  const { deck, cards, logs, now } = data
  if (!deck) {
    return (
      <p className={muted}>
        This deck doesn't exist. <Link to="/decks" className="underline">Back to your decks</Link>
      </p>
    )
  }

  const studyCards = cards.map(toStudyCard)
  const due = countDue(studyCards, now, DEFAULT_LIMITS, doneToday(logs, now))
  const dueTotal = totalDue(due)
  const testUpcoming = deck.testDate !== undefined && deck.testDate > now
  const ready = Math.round(readiness(studyCards, now) * 100)

  const dueText =
    dueTotal === 0
      ? "You're all caught up for today."
      : [
          due.learning + due.review > 0 && `${due.learning + due.review} to review`,
          due.new > 0 && `${due.new} new`,
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <div className="space-y-6">
      <div>
        <Link to="/decks" className={`${muted} hover:underline`}>
          ← Decks
        </Link>
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        <p className={muted}>{cards.length} cards</p>
      </div>

      {cards.length > 0 ? (
        <section className={`${panel} space-y-4`}>
          <p className="text-lg">{dueText}</p>
          <div className="flex flex-wrap gap-3">
            {dueTotal > 0 ? (
              <Link to={`/decks/${deck.id}/study`} className={btn}>
                Study now ({dueTotal})
              </Link>
            ) : (
              <span className={`${btn} pointer-events-none opacity-40`}>Study now</span>
            )}
            <Link to={`/decks/${deck.id}/cram`} className={btnSecondary}>
              Cram for a test
            </Link>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <label className="flex flex-wrap items-center gap-3 text-sm">
              <span>When's your test?</span>
              <input
                type="date"
                className={input.replace('w-full', 'w-auto')}
                min={toDateInput(now)}
                value={deck.testDate ? toDateInput(deck.testDate) : ''}
                onChange={(e) => {
                  if (!e.target.value) return db.decks.update(deck.id, { testDate: undefined })
                  const [y, m, d] = e.target.value.split('-').map(Number)
                  setTestDate(deck.id, endOfDay(new Date(y, m - 1, d).getTime()))
                }}
              />
              {deck.testDate && (
                <button type="button" className={`${link} text-sm`} onClick={() => db.decks.update(deck.id, { testDate: undefined })}>
                  Clear
                </button>
              )}
            </label>
            {testUpcoming ? (
              <div className="space-y-1">
                <p className="text-sm">
                  Ready for your test on{' '}
                  {new Date(deck.testDate!).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}:{' '}
                  <strong>{ready}%</strong>
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full bg-green-600" style={{ width: `${ready}%` }} />
                </div>
                <p className={muted}>Every card will come up again before your test.</p>
              </div>
            ) : (
              <p className={muted}>Set a date and StudyKey makes sure every card comes up before it.</p>
            )}
          </div>
        </section>
      ) : (
        <p className={muted}>This deck has no cards yet.</p>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Cards</h2>
        <Link to={`/generate?deck=${deck.id}`} className={`${link} text-sm`}>
          + Add more cards
        </Link>
      </div>
      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={c.id} className={`${panel} flex items-start justify-between gap-4`}>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{c.front}</p>
              <p className={muted}>{c.back}</p>
            </div>
            <button type="button" className={btnDanger} onClick={() => db.cards.delete(c.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
