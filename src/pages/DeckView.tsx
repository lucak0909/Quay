import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { db } from '../db'
import { btn, btnDanger, muted, panel } from '../ui'

export default function DeckView() {
  const { id = '' } = useParams()
  const deck = useLiveQuery(async () => (await db.decks.get(id)) ?? null, [id])
  const cards = useLiveQuery(() => db.cards.where('deckId').equals(id).sortBy('createdAt'), [id])

  if (deck === undefined || cards === undefined) return null
  if (deck === null) {
    return (
      <p className={muted}>
        This deck doesn't exist. <Link to="/decks" className="underline">Back to your decks</Link>
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{deck.name}</h1>
          <p className={muted}>{cards.length} cards · Studying these cards arrives in the next update.</p>
        </div>
        <Link to={`/generate?deck=${deck.id}`} className={btn}>
          Add more cards
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
