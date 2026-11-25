import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StudyCardView from '../components/StudyCardView'
import { db, type Card, type Deck } from '../db'
import { answerCram, cramMastered, startCram, type CramSession } from '../srs/cram'
import { newState } from '../srs/scheduler'
import { btn, btnSecondary, muted } from '../ui'

export default function Cram() {
  const { id = '' } = useParams()
  const [deck, setDeck] = useState<Deck | null | 'missing'>(null)
  const [cards, setCards] = useState<Map<string, Card>>(new Map())
  const [session, setSession] = useState<CramSession | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState(0)

  useEffect(() => {
    Promise.all([db.decks.get(id), db.cards.where('deckId').equals(id).toArray()]).then(([d, cs]) => {
      if (!d) return setDeck('missing')
      setDeck(d)
      setCards(new Map(cs.map((c) => [c.id, c])))
      setSession(startCram(cs.map((c) => c.id)))
    })
  }, [id])

  const answer = useCallback(
    (gotIt: boolean) => {
      if (!session || session.queue.length === 0) return
      const card = cards.get(session.queue[0])!
      // Logged for streaks and stats; cramming never changes the long-term schedule.
      db.reviews.add({
        cardId: card.id,
        deckId: card.deckId,
        at: Date.now(),
        grade: gotIt ? 'good' : 'again',
        mode: 'cram',
        prevPhase: (card.srs ?? newState()).phase,
      })
      setSession(answerCram(session, gotIt))
      setAnswers((n) => n + 1)
      setRevealed(false)
    },
    [session, cards],
  )

  const reveal = useCallback(() => setRevealed(true), [])

  if (deck === 'missing') {
    return (
      <p className={muted}>
        This deck doesn't exist. <Link to="/decks" className="underline">Back to your decks</Link>
      </p>
    )
  }
  if (deck === null || !session) return null

  const mastered = cramMastered(session)
  const current = cards.get(session.queue[0])

  if (!current) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-2xl font-semibold">{session.total === 0 ? 'This deck is empty' : 'Deck crammed!'}</h1>
        {session.total > 0 && (
          <p>You got every card right twice in a row. Do it again tomorrow to make it stick.</p>
        )}
        <div className="flex justify-center gap-3">
          <Link to={`/decks/${deck.id}`} className={btnSecondary}>
            Back to {deck.name}
          </Link>
          {session.total > 0 && (
            <button
              type="button"
              className={btn}
              onClick={() => {
                setSession(startCram([...cards.keys()]))
                setAnswers(0)
              }}
            >
              Cram again
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <Link to={`/decks/${deck.id}`} className={`${muted} hover:underline`}>
          ← {deck.name}
        </Link>
        <span className={muted}>
          Cramming: {mastered} of {session.total} done
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${(mastered / session.total) * 100}%` }} />
      </div>
      <StudyCardView
        key={current.id + answers}
        front={current.front}
        back={current.back}
        revealed={revealed}
        onReveal={reveal}
        onAnswer={answer}
      />
      <p className={`${muted} text-center`}>Cramming doesn't change when cards come up in your normal reviews.</p>
    </div>
  )
}
