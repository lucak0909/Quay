import { useEffect } from 'react'
import { btn, btnSecondary, muted } from '../ui'

interface Props {
  front: string
  back: string
  revealed: boolean
  onReveal: () => void
  onAnswer: (gotIt: boolean) => void
  busy?: boolean
}

// One flashcard with Show answer → Forgot / Got it. Keyboard: Space to flip, 1 or 2 to answer.
export default function StudyCardView({ front, back, revealed, onReveal, onAnswer, busy }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || e.repeat || busy) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        onReveal()
      } else if (revealed && e.key === '1') onAnswer(false)
      else if (revealed && e.key === '2') onAnswer(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, onReveal, onAnswer, busy])

  return (
    <div className="space-y-4">
      <div className="glass min-h-56 space-y-4 rounded-[32px] p-8 text-xl leading-relaxed">
        <p className="whitespace-pre-wrap font-medium">{front}</p>
        {revealed && (
          <p className="whitespace-pre-wrap border-t border-black/[.06] pt-4 dark:border-white/10">{back}</p>
        )}
      </div>
      {revealed ? (
        <div className="flex gap-3">
          <button type="button" className={`${btnSecondary} flex-1 py-3`} disabled={busy} onClick={() => onAnswer(false)}>
            Forgot <span className={`ml-2 ${muted}`}>1</span>
          </button>
          <button type="button" className={`${btn} flex-1 py-3`} disabled={busy} onClick={() => onAnswer(true)}>
            Got it <span className="ml-2 text-indigo-200">2</span>
          </button>
        </div>
      ) : (
        <button type="button" className={`${btn} w-full py-3`} onClick={onReveal}>
          Show answer <span className="ml-2 text-indigo-200">Space</span>
        </button>
      )}
    </div>
  )
}
