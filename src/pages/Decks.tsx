import { Link } from 'react-router-dom'
import { totalDue } from '../srs/queue'
import { useDeckSummaries } from '../srs/store'
import { btn, btnSecondary, link, muted, panel } from '../ui'

export default function Decks() {
  const decks = useDeckSummaries()
  if (!decks) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Decks</h1>
        <Link to="/generate" className={btnSecondary}>
          Make cards
        </Link>
      </div>
      {decks.length === 0 ? (
        <p className={muted}>No decks yet. Make some cards from your notes and save them to a new deck.</p>
      ) : (
        <ul className="space-y-2">
          {decks.map((d) => {
            const due = totalDue(d.due)
            return (
              <li key={d.id} className={`${panel} flex items-center justify-between gap-4`}>
                <div>
                  <Link to={`/decks/${d.id}`} className={link}>
                    {d.name}
                  </Link>
                  <p className={muted}>
                    {d.cardCount} cards{due > 0 ? ` · ${due} to study today` : ' · all caught up'}
                  </p>
                </div>
                {due > 0 && (
                  <Link to={`/decks/${d.id}/study`} className={btn}>
                    Study ({due})
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
