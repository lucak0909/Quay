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
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={() => grade(false)}>
            Forgot
          </button>
          <button type="button" className={btn} onClick={() => grade(true)}>
            Got it
          </button>
        </div>
      ) : (
        <button type="button" className={btn} onClick={() => setRevealed(true)}>
          Show answer
        </button>
      )}
    </div>
  )
}
