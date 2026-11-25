import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import ExampleDemo from '../components/ExampleDemo'
import { HowItWorks, WhatIsAKey } from '../components/Explainer'
import { db } from '../db'
import { totalDue } from '../srs/queue'
import { useDeckSummaries } from '../srs/store'
import { useActiveProvider } from '../settings'
import { btn, btnSecondary, link, muted, panel , title } from '../ui'

export default function Home() {
  const active = useActiveProvider()
  const deckCount = useLiveQuery(() => db.decks.count())
  if (active === undefined || deckCount === undefined) return null
  return active || deckCount > 0 ? <Dashboard /> : <Welcome />
}

function Welcome() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">Turn your notes into flashcards for a few cents</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Paste your class notes and Quay's AI writes the flashcards for you. No subscription: you pay the AI
          company directly for what you use.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/setup" className={btn}>
            Get started (about 5 minutes)
          </Link>
          <a href="#example" className={btnSecondary}>
            See an example first
          </a>
        </div>
      </div>
      <HowItWorks />
      <div id="example">
        <ExampleDemo />
      </div>
      <WhatIsAKey />
      <p className={muted}>
        Questions? Read the <Link to="/help" className={link}>FAQ</Link>.
      </p>
    </div>
  )
}

function Dashboard() {
  const decks = useDeckSummaries()
  if (!decks) return null
  const dueTotal = decks.reduce((sum, d) => sum + totalDue(d.due), 0)
  const firstDue = decks.find((d) => totalDue(d.due) > 0)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className={title}>Welcome back</h1>
        <p className="text-slate-600 dark:text-slate-400">
          {dueTotal > 0
            ? `You have ${dueTotal} ${dueTotal === 1 ? 'card' : 'cards'} to study today.`
            : decks.length > 0
              ? "You're all caught up for today."
              : 'Make your first cards to get started.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {firstDue ? (
            <>
              <Link to={`/decks/${firstDue.id}/study`} className={btn}>
                Study {firstDue.name}
              </Link>
              <Link to="/generate" className={btnSecondary}>
                Make cards
              </Link>
            </>
          ) : (
            <Link to="/generate" className={btn}>
              Make cards from your notes
            </Link>
          )}
        </div>
      </div>
      <section className={`${panel} space-y-2`}>
        <h2 className="font-semibold">Your decks</h2>
        {decks.length === 0 && <p className={muted}>No decks yet. Make some cards to create your first deck.</p>}
        <ul className="space-y-1 text-sm">
          {decks.slice(0, 5).map((d) => (
            <li key={d.id}>
              <Link to={`/decks/${d.id}`} className={link}>
                {d.name}
              </Link>{' '}
              <span className={muted}>
                · {d.cardCount} cards{totalDue(d.due) > 0 ? ` · ${totalDue(d.due)} to study` : ''}
              </span>
            </li>
          ))}
        </ul>
        {decks && decks.length > 0 && (
          <Link to="/decks" className={`${link} text-sm`}>
            All decks →
          </Link>
        )}
      </section>
      <details className={panel}>
        <summary className="cursor-pointer font-semibold">See the example again</summary>
        <div className="mt-4">
          <ExampleDemo />
        </div>
      </details>
    </div>
  )
}
