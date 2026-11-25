import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HowItWorks, WhatIsAKey } from '../components/Explainer'
import { formatUsd, typicalSetCost } from '../cost/pricing'
import { PROVIDERS } from '../providers/catalog'
import { cheapestModel } from '../providers/presets'
import { useActiveProvider, type ActiveProvider } from '../settings'
import { link, panel , title } from '../ui'

const cheapestCosts = PROVIDERS.map((p) => typicalSetCost(cheapestModel(p))).filter((c): c is number => c !== undefined)
const cheapestRange = `from about ${formatUsd(Math.min(...cheapestCosts))} to ${formatUsd(Math.max(...cheapestCosts))}`

// Links to the connected AI company's page, or to setup if none is connected yet.
function AccountLink({ active, url, label }: { active: ActiveProvider | null; url?: string; label: string }) {
  if (active && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={link}>
        {label} with {active.info.company} ↗
      </a>
    )
  }
  return (
    <Link to="/setup" className={link}>
      {label} (connect an AI account first)
    </Link>
  )
}

function buildFaqs(active: ActiveProvider | null): { q: string; a: ReactNode }[] {
  return [
    {
      q: 'Why do I pay the AI company and not Quay?',
      a: (
        <>
          Quay doesn't run its own AI. The AI that writes your cards belongs to an AI company (such as Anthropic,
          Google or OpenAI), so the cost goes straight to them, at their normal prices. Apps with a subscription pay the
          same AI companies and add a markup, plus usage limits. With Quay there's no middleman.
        </>
      ),
    },
    {
      q: 'How much will this cost me?',
      a: (
        <>
          On the cheapest settings, {cheapestRange} for 10 pages of notes, depending on the AI company. Before every
          request Quay shows you the estimated cost, and you can set a monthly budget in{' '}
          <Link to="/settings" className={link}>
            Settings
          </Link>
          .
        </>
      ),
    },
    {
      q: 'Which AI company should I pick?',
      a: (
        <>
          Any of them works well for flashcards. The setup page shows what each costs for a typical set of notes. Google
          has a free option with daily limits, but on that option Google may use what you send to improve its products.
          You can switch at any time in Settings.
        </>
      ),
    },
    {
      q: 'Is my key safe?',
      a: (
        <>
          Your key is saved in this browser on this device only. Quay has no servers that see or store it. It's only
          sent to the AI company when you make cards. Anyone who can use this browser profile could read it, so don't
          use Quay on a shared computer without removing your key afterwards.
        </>
      ),
    },
    {
      q: 'Does Quay see my notes?',
      a: <>No. Your notes and cards stay on this device. Notes are only sent to the AI company when you press Make cards.</>,
    },
    {
      q: 'What happens if I run out of credit?',
      a: (
        <>
          Quay will tell you your AI account is out of credit. Nothing is lost. Your decks and studying still work
          without credit, because credit is only needed to make new cards. Add more:{' '}
          <AccountLink active={active} url={active?.info.billingUrl} label="Add credit" />.
        </>
      ),
    },
    {
      q: 'How do I stop spending?',
      a: (
        <>
          Quay only spends when you press Make cards. To be extra safe, set a monthly budget in Settings, set a
          spending limit on your AI account (
          <AccountLink active={active} url={active?.info.limitsUrl} label="Set a limit" />
          ), or delete your key on your AI company's website so it stops working everywhere.
        </>
      ),
    },
    {
      q: 'What do the technical words mean?',
      a: (
        <dl className="space-y-1">
          <div>
            <dt className="inline font-medium">API key:</dt> <dd className="inline">the "key" you paste into Quay.</dd>
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
}

export default function Help() {
  const active = useActiveProvider()
  if (active === undefined) return null
  return (
    <div className="space-y-6">
      <h1 className={title}>Help</h1>
      <HowItWorks />
      <WhatIsAKey />
      <section className={`${panel} space-y-3`}>
        <h2 className="text-lg font-semibold">Questions</h2>
        {buildFaqs(active).map((f) => (
          <details key={f.q} className="rounded-xl border border-black/[.06] p-3 dark:border-white/10">
            <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
            <div className="mt-2 text-sm">{f.a}</div>
          </details>
        ))}
      </section>
    </div>
  )
}
