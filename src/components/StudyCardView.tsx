import { useEffect } from 'react'
import { btn } from '../ui'

export interface Answer {
  label: string
  // When the card will come back if this is chosen, e.g. "10m" or "3d".
  hint?: string
  tone: 'red' | 'amber' | 'green' | 'blue'
}

interface Props {
  front: string
  back: string
  revealed: boolean
  onReveal: () => void
  answers: Answer[]
  onAnswer: (index: number) => void
  // Which answer Space picks once the answer is showing (Anki uses Good).
  spaceAnswer?: number
  busy?: boolean
}

const TONES: Record<Answer['tone'], string> = {
  red: 'text-red-600 dark:text-red-300',
  amber: 'text-amber-600 dark:text-amber-300',
  green: 'text-emerald-600 dark:text-emerald-300',
  blue: 'text-sky-600 dark:text-sky-300',
}

// One flashcard: Show answer, then one button per answer.
// Keyboard: Space to flip, then 1, 2, 3… to answer (Space picks the usual answer).
export default function StudyCardView({ front, back, revealed, onReveal, answers, onAnswer, spaceAnswer, busy }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || e.repeat || busy) return
      if (!revealed) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onReveal()
        }
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= answers.length) onAnswer(n - 1)
      else if ((e.key === ' ' || e.key === 'Enter') && spaceAnswer !== undefined) {
        e.preventDefault()
        onAnswer(spaceAnswer)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, onReveal, onAnswer, answers.length, spaceAnswer, busy])

  return (
    <div className="space-y-4">
      <div className="glass min-h-56 space-y-4 rounded-[32px] p-8 text-xl leading-relaxed">
        <p className="whitespace-pre-wrap font-medium">{front}</p>
        {revealed && <p className="whitespace-pre-wrap border-t border-black/[.06] pt-4 dark:border-white/10">{back}</p>}
      </div>
      {revealed ? (
        <div className={`grid gap-2 ${answers.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
          {answers.map((a, i) => (
            <button
              key={a.label}
              type="button"
              disabled={busy}
              onClick={() => onAnswer(i)}
              className="glass flex flex-col items-center gap-0.5 rounded-3xl px-3 py-3 transition hover:bg-white/80 active:scale-[.97] disabled:opacity-40 dark:hover:bg-white/15"
            >
              <span className={`font-semibold ${TONES[a.tone]}`}>{a.label}</span>
              <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                {a.hint ?? ' '}
                <span className="ml-1.5 hidden text-slate-400 sm:inline dark:text-slate-500">· {i + 1}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className={`${btn} w-full py-3`} onClick={onReveal}>
          Show answer <span className="ml-2 text-indigo-200">Space</span>
        </button>
      )}
    </div>
  )
}
