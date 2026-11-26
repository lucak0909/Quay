import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StudyCardView, { type Answer } from '../components/StudyCardView'
import { db, type Card, type Deck } from '../db'
import { countDue, DEFAULT_LIMITS, endOfDay, nextCard, totalDue, type DoneToday } from '../srs/queue'
import { formatInterval } from '../srs/format'
import { DAY, newState, schedule, type Grade } from '../srs/scheduler'
import { loadDeckStudy, toStudyCard } from '../srs/store'
import { btn, btnSecondary, muted, title } from '../ui'

const GRADES: { grade: Grade; label: string; tone: Answer['tone'] }[] = [
  { grade: 'again', label: 'Again', tone: 'red' },
  { grade: 'hard', label: 'Hard', tone: 'amber' },
  { grade: 'good', label: 'Good', tone: 'green' },
  { grade: 'easy', label: 'Easy', tone: 'blue' },
]

interface Session {
  deck: Deck
  cards: Card[]
  done: DoneToday
  // When the session last changed; render uses this rather than reading the clock.
  now: number
}

export default function Study() {
  const { id = '' } = useParams()
  const [session, setSession] = useState<Session | null | 'missing'>(null)
  const [currentId, setCurrentId] = useState<string | undefined>()
  const [revealed, setRevealed] = useState(false)
  const [studied, setStudied] = useState<Set<string>>(new Set())
  // True between showing an answer and grading it, so a quick double key press can't grade twice.
  const canAnswer = useRef(false)

  useEffect(() => {
    const now = Date.now()
    loadDeckStudy(id, now).then(({ deck, cards, done }) => {
      if (!deck) return setSession('missing')
      setSession({ deck, cards, done, now })
      setCurrentId(nextCard(cards.map(toStudyCard), now, DEFAULT_LIMITS, done)?.id)
    })
  }, [id])

  const answer = useCallback(
    (index: number) => {
      if (!session || session === 'missing' || !currentId || !canAnswer.current) return
      canAnswer.current = false
      const now = Date.now()
      const card = session.cards.find((c) => c.id === currentId)!
      const prev = card.srs ?? newState()
      const grade = GRADES[index].grade
      const srs = schedule(prev, grade, now, undefined, session.deck.testDate)
      // Move on straight away, and save in the background, so a quick key press is never dropped.
      void db.transaction('rw', db.cards, db.reviews, async () => {
        await db.cards.update(card.id, { srs, updatedAt: now })
        await db.reviews.add({ cardId: card.id, deckId: card.deckId, at: now, grade, mode: 'learn', prevPhase: prev.phase })
      })
      const cards = session.cards.map((c) => (c.id === card.id ? { ...c, srs } : c))
      const done = {
        newCards: session.done.newCards + (prev.phase === 'new' ? 1 : 0),
        reviews: session.done.reviews + (prev.phase === 'review' ? 1 : 0),
      }
      setSession({ ...session, cards, done, now })
      setStudied((s) => new Set(s).add(card.id))
      setRevealed(false)
      setCurrentId(nextCard(cards.map(toStudyCard), now, DEFAULT_LIMITS, done)?.id)
    },
    [session, currentId],
  )

  const reveal = useCallback(() => {
    canAnswer.current = true
    setRevealed(true)
  }, [])

  if (session === null) return null
  if (session === 'missing') {
    return (
      <p className={muted}>
        This deck doesn't exist. <Link to="/decks" className="underline">Back to your decks</Link>
      </p>
    )
  }

  const { deck, cards, done, now } = session
  const studyCards = cards.map(toStudyCard)
  const left = totalDue(countDue(studyCards, now, DEFAULT_LIMITS, done))
  const current = cards.find((c) => c.id === currentId)
  // Each button says when the card would come back, so the choice is concrete.
  const answers: Answer[] = GRADES.map(({ grade, label, tone }) => {
    const next = schedule(current?.srs ?? newState(), grade, now, undefined, deck.testDate)
    return { label, tone, hint: formatInterval(next.due - now) }
  })

  if (!current) {
    const tomorrow = studyCards.filter((c) => c.srs.phase !== 'new' && c.srs.due <= endOfDay(now + DAY)).length
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className={title}>{studied.size > 0 ? 'Nice work!' : 'Nothing to study right now'}</h1>
        <p>
          {studied.size > 0 ? `You studied ${studied.size} ${studied.size === 1 ? 'card' : 'cards'}. ` : ''}
          {tomorrow > 0
            ? `${tomorrow} ${tomorrow === 1 ? 'card is' : 'cards are'} due tomorrow.`
            : "You're all caught up on this deck."}
        </p>
        <div className="flex justify-center gap-3">
          <Link to={`/decks/${deck.id}`} className={btn}>
            Back to {deck.name}
          </Link>
          {cards.length > 0 && (
            <Link to={`/decks/${deck.id}/cram`} className={btnSecondary}>
              Cram the whole deck
            </Link>
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
        <span className={muted}>{left} left today</span>
      </div>
      <StudyCardView
        front={current.front}
        back={current.back}
        revealed={revealed}
        onReveal={reveal}
        answers={answers}
        onAnswer={answer}
        spaceAnswer={2}
      />
    </div>
  )
}
