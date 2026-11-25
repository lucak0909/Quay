import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { btn, link, muted, panel } from '../ui'

export default function Decks() {
  const decks = useLiveQuery(async () => {
    const all = await db.decks.orderBy('updatedAt').reverse().toArray()
    return Promise.all(all.map(async (d) => ({ ...d, count: await db.cards.where('deckId').equals(d.id).count() })))
  })
  if (!decks) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Decks</h1>
        <Link to="/generate" className={btn}>
          Make cards
        </Link>
      </div>
      {decks.length === 0 ? (
        <p className={muted}>No decks yet. Make some cards from your notes and save them to a new deck.</p>
      ) : (
        <ul className="space-y-2">
          {decks.map((d) => (
            <li key={d.id} className={`${panel} flex items-center justify-between`}>
              <Link to={`/decks/${d.id}`} className={link}>
                {d.name}
              </Link>
              <span className={muted}>{d.count} cards</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
