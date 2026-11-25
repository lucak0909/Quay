import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HowItWorks, WhatIsAKey } from '../components/Explainer'
import { ANTHROPIC } from '../providers/catalog'
import { link, panel } from '../ui'

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: 'Why do I pay the AI company and not StudyKey?',
    a: (
      <>
        StudyKey doesn't run its own AI. The AI that writes your cards belongs to a company like Anthropic, so the cost
        goes straight to them, at their normal prices. Apps with a subscription pay the same AI companies and add a
        markup, plus usage limits. With StudyKey there's no middleman.
      </>
    ),
  },
  {
    q: 'How much will this cost me?',
    a: (
      <>
        On the cheapest setting, about 2 cents for 10 pages of notes. Before every request StudyKey shows you the
        estimated cost, and you can set a monthly budget in{' '}
        <Link to="/settings" className={link}>
          Settings
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Is my key safe?',
    a: (
      <>
        Your key is saved in this browser on this device only. StudyKey has no servers that see or store it. It's only
        sent to the AI company when you make cards. Anyone who can use this browser profile could read it, so don't use
        StudyKey on a shared computer without removing your key afterwards.
      </>
    ),
  },
  {
    q: 'Does StudyKey see my notes?',
    a: <>No. Your notes and cards stay on this device. Notes are only sent to the AI company when you press Make cards.</>,
  },
  {
    q: 'What happens if I run out of credit?',
    a: (
      <>
        StudyKey will tell you your AI account is out of credit. Nothing is lost. Your decks and studying still work
        without credit, because credit is only needed to make new cards. Add more on{' '}
        <a href={ANTHROPIC.billingUrl} target="_blank" rel="noreferrer" className={link}>
          Anthropic's billing page ↗
        </a>
        .
      </>
    ),
  },
  {
    q: 'How do I stop spending?',
    a: (
      <>
        StudyKey only spends when you press Make cards. To be extra safe: set a monthly budget in Settings, set a
        spending limit in your{' '}
        <a href={ANTHROPIC.limitsUrl} target="_blank" rel="noreferrer" className={link}>
          Anthropic account ↗
        </a>
        , or delete your key on Anthropic's keys page so it stops working everywhere.
      </>
    ),
  },
  {
    q: 'What do the technical words mean?',
    a: (
      <dl className="space-y-1">
        <div>
          <dt className="inline font-medium">API key:</dt> <dd className="inline">the "key" you paste into StudyKey.</dd>
        </div>
        <div>
          <dt className="inline font-medium">Model:</dt>{' '}
          <dd className="inline">a specific version of an AI. The quality setting picks one for you.</dd>
        </div>
        <div>
          <dt className="inline font-medium">Tokens:</dt>{' '}
          <dd className="inline">
            how AI companies measure text, roughly ¾ of a word each. Prices are per million tokens.
          </dd>
        </div>
      </dl>
    ),
  },
]

export default function Help() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Help</h1>
      <HowItWorks />
      <WhatIsAKey />
      <section className={`${panel} space-y-3`}>
        <h2 className="text-lg font-semibold">Questions</h2>
        {faqs.map((f) => (
          <details key={f.q} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
            <div className="mt-2 text-sm">{f.a}</div>
          </details>
        ))}
      </section>
    </div>
  )
}
