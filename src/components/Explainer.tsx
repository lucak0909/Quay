import { muted, panel } from '../ui'

export function HowItWorks() {
  return (
    <section className={`${panel} space-y-3`}>
      <h2 className="text-lg font-semibold">How StudyKey works</h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          StudyKey uses an AI (like ChatGPT or Claude) to turn your notes into flashcards.
        </li>
        <li>
          Instead of paying us a subscription, <strong>you pay the AI company directly</strong>, and only for what
          you use. It's like paying for electricity by the meter, instead of a flat monthly fee that still cuts you
          off.
        </li>
        <li>
          A typical set of notes costs <strong>a few cents</strong>. Even heavy use is usually under $3 a month.
        </li>
      </ol>
      <CostComparison />
    </section>
  )
}

export function CostComparison() {
  const rows = [
    ['StudyKey (pay as you go)', 'about $2–24', 'No limit except your own budget'],
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
        StudyKey range assumes 10–120 sets of notes a month for 9 study months, on the cheapest setting.
      </p>
    </div>
  )
}

export function WhatIsAKey() {
  return (
    <section className={`${panel} space-y-2`}>
      <h2 className="text-lg font-semibold">What's a "key"?</h2>
      <p className="text-sm">
        A key is a private password that lets StudyKey use your AI account. You create it on the AI company's
        website and paste it into StudyKey.
      </p>
      <p className="text-sm">
        It stays on this device. StudyKey has no servers that see or store it, and it's only ever sent to the AI
        company when you make cards. Don't share it with anyone.
      </p>
    </section>
  )
}
