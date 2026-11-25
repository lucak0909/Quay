import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import ExampleDemo from '../components/ExampleDemo'
import { HowItWorks, WhatIsAKey } from '../components/Explainer'
import { db } from '../db'
import { useProviderSettings } from '../settings'
import { btn, btnSecondary, link, muted, panel } from '../ui'

export default function Home() {
  const providers = useProviderSettings()
  if (!providers) return null
  return providers.anthropic.apiKey ? <Dashboard /> : <Welcome />
}

function Welcome() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">Turn your notes into flashcards for a few cents</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Paste your class notes and StudyKey's AI writes the flashcards for you. No subscription: you pay the AI
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
  const decks = useLiveQuery(async () => {
    const all = await db.decks.orderBy('updatedAt').reverse().limit(5).toArray()
    return Promise.all(all.map(async (d) => ({ ...d, count: await db.cards.where('deckId').equals(d.id).count() })))
  })

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <Link to="/generate" className={btn}>
          Make cards from your notes
        </Link>
      </div>
      <section className={`${panel} space-y-2`}>
        <h2 className="font-semibold">Your decks</h2>
        {decks && decks.length === 0 && <p className={muted}>No decks yet. Make some cards to create your first deck.</p>}
        <ul className="space-y-1 text-sm">
          {decks?.map((d) => (
            <li key={d.id}>
              <Link to={`/decks/${d.id}`} className={link}>
                {d.name}
              </Link>{' '}
              <span className={muted}>· {d.count} cards</span>
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
