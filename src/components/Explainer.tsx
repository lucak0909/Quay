import { costRange, formatUsd, TYPICAL_SET } from '../cost/pricing'
import { PROVIDERS } from '../providers/catalog'
import { cheapestModel } from '../providers/presets'
import { muted, panel } from '../ui'

export function HowItWorks() {
  return (
    <section className={`${panel} space-y-3`}>
      <h2 className="text-lg font-semibold">How Quay works</h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          Quay uses an AI (like ChatGPT or Claude) to turn your notes into flashcards.
        </li>
        <li>
          Instead of paying us a subscription, <strong>you pay the AI company directly</strong>, and only for what
          you use. It's like paying only for the petrol your taxi ride uses, instead of the whole taxi fare.
        </li>
        <li>
          A typical set of notes costs <strong>a few cents</strong>. Even heavy use is usually under $3 a month.
        </li>
      </ol>
      <CostComparison />
    </section>
  )
}

const STUDY_MONTHS = 9
const [cheapestSet, dearestSet] = costRange(
  PROVIDERS.map(cheapestModel),
  TYPICAL_SET.inputTokens,
  TYPICAL_SET.outputTokens,
)
const yearMin = cheapestSet * 10 * STUDY_MONTHS
const yearMax = dearestSet * 120 * STUDY_MONTHS
const roughUsd = (n: number) => (n >= 1 ? `$${Math.round(n)}` : formatUsd(n))

export function CostComparison() {
  const rows = [
    ['Quay (pay as you go)', `about ${roughUsd(yearMin)}–${roughUsd(yearMax).slice(1)}`, 'No limit except your own budget'],
    ['RemNote Pro with AI', '$240', 'Monthly AI credit cap'],
    ['Quizlet Plus', 'about $36–45', 'Limits on AI note uploads'],
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className={muted}>
          <tr>
            <th className="py-1 pr-4 font-medium"></th>
            <th className="py-1 pr-4 font-medium">Per year</th>
            <th className="py-1 font-medium">Limits</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, price, limit], i) => (
            <tr key={name} className={i === 0 ? 'font-medium text-indigo-700 dark:text-indigo-300' : ''}>
              <td className="py-1 pr-4">{name}</td>
              <td className="py-1 pr-4">{price}</td>
              <td className="py-1">{limit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`${muted} mt-1 text-xs`}>
        Quay range assumes 10–120 sets of notes a month for 9 study months, on the cheapest setting of each AI
        company Quay supports.
      </p>
    </div>
  )
}

export function WhatIsAKey() {
  return (
    <section className={`${panel} space-y-2`}>
      <h2 className="text-lg font-semibold">What's a "key"?</h2>
      <p className="text-sm">
        A key is a private password that lets Quay use your AI account. You create it on the AI company's
        website and paste it into Quay.
      </p>
      <p className="text-sm">
        It stays on this device. Quay has no servers that see or store it, and it's only ever sent to the AI
        company when you make cards. Don't share it with anyone.
      </p>
    </section>
  )
}
