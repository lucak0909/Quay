import { useState } from 'react'
import { buildUserPrompt, SYSTEM_PROMPT } from '../cards/prompt'
import { estimateRequest } from '../cost/estimate'
import { formatUsd } from '../cost/pricing'
import { SAMPLE_CARDS, SAMPLE_NOTES, SAMPLE_TITLE } from '../example/sample'
import { PROVIDERS } from '../providers/catalog'
import { btn, btnSecondary, muted, panel } from '../ui'

const sampleCosts = PROVIDERS.map(
  (p) =>
    estimateRequest(p.presets[0].model, SYSTEM_PROMPT + buildUserPrompt(SAMPLE_NOTES, SAMPLE_CARDS.length), SAMPLE_CARDS.length)
      .typicalCost,
).filter((c): c is number => c !== null)
// What the real study buttons look like for a new card (the demo only counts right and wrong).
const DEMO_ANSWERS = [
  { label: 'Again', hint: '1m', color: 'text-red-600 dark:text-red-300', gotIt: false },
  { label: 'Hard', hint: '6m', color: 'text-amber-600 dark:text-amber-300', gotIt: true },
  { label: 'Good', hint: '10m', color: 'text-emerald-600 dark:text-emerald-300', gotIt: true },
  { label: 'Easy', hint: '4d', color: 'text-sky-600 dark:text-sky-300', gotIt: true },
]
const sampleMin = Math.min(...sampleCosts)
const sampleMax = Math.max(...sampleCosts)

export default function ExampleDemo() {
  return (
    <section className={`${panel} space-y-4`}>
      <div>
        <h2 className="text-lg font-semibold">See an example</h2>
        <p className={muted}>Here are some sample class notes and the cards Quay made from them.</p>
      </div>

      <details className="glass-inset rounded-2xl p-3.5" open>
        <summary className="cursor-pointer text-sm font-medium">The notes: {SAMPLE_TITLE}</summary>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{SAMPLE_NOTES}</pre>
      </details>

      <p className="text-sm">
        ↓ Quay turned them into <strong>{SAMPLE_CARDS.length} flashcards</strong>. Making these with your
        own key would cost between <strong>{formatUsd(sampleMin)}</strong> and{' '}
        <strong>{formatUsd(sampleMax)}</strong>, depending on the AI company you choose.
      </p>

      <ReviewDemo />
    </section>
  )
}

function ReviewDemo() {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ gotIt: 0, forgot: 0 })
  const done = index >= SAMPLE_CARDS.length
  const card = SAMPLE_CARDS[index]

  function grade(gotIt: boolean) {
    setScore((s) => (gotIt ? { ...s, gotIt: s.gotIt + 1 } : { ...s, forgot: s.forgot + 1 }))
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm dark:border-slate-700">
        <p>
          Done! You got {score.gotIt} of {SAMPLE_CARDS.length}. In the real app, cards you forget come back sooner
          and cards you know come back less often, so you spend your time on what you don't know yet.
        </p>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => {
            setIndex(0)
            setScore({ gotIt: 0, forgot: 0 })
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className={muted}>
        Try studying them: card {index + 1} of {SAMPLE_CARDS.length}
      </p>
      <div className="min-h-32 space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="font-medium">{card.front}</p>
        {revealed && <p className="border-t border-black/[.06] pt-3 dark:border-white/10">{card.back}</p>}
      </div>
      {revealed ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DEMO_ANSWERS.map((a) => (
            <button key={a.label} type="button" className={`${btnSecondary} flex-col gap-0`} onClick={() => grade(a.gotIt)}>
              <span className={`font-semibold ${a.color}`}>{a.label}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{a.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className={btn} onClick={() => setRevealed(true)}>
          Show answer
        </button>
      )}
    </div>
  )
}
