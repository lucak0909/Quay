import { useEffect, useState } from 'react'
import { checkForUpdate, type AvailableUpdate } from '../updates'
import { btn, btnSecondary } from '../ui'

// Desktop only: when a new version is out, offer it quietly in the corner. Nothing installs without a click.
export default function UpdateBanner() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [state, setState] = useState<'offer' | 'installing' | 'failed' | 'hidden'>('offer')
  const [progress, setProgress] = useState<number | null>(null)

  useEffect(() => {
    // Offline or GitHub unreachable: say nothing, and try again next time Quay opens.
    checkForUpdate().then(setUpdate, () => {})
  }, [])

  if (!update || state === 'hidden') return null
  return (
    <div
      role="status"
      className="glass-thick fixed bottom-24 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] space-y-3 rounded-3xl p-4 text-sm sm:bottom-4"
    >
      {state === 'installing' ? (
        <>
          <p className="font-medium">Updating to Quay {update.version}…</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/[.06] dark:bg-white/10">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${Math.round((progress ?? 0.1) * 100)}%` }} />
          </div>
          <p className="text-slate-500 dark:text-slate-400">Quay restarts by itself when it's done. Your notes and cards are kept.</p>
        </>
      ) : (
        <>
          <p>
            <span className="font-medium">Quay {update.version} is available.</span>{' '}
            {state === 'failed' ? "The update didn't finish. Try again, or later." : 'It only takes a moment, and your notes and cards are kept.'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={`${btn} px-4 py-2`}
              onClick={() => {
                setState('installing')
                update.install(setProgress).catch(() => setState('failed'))
              }}
            >
              Update and restart
            </button>
            <button type="button" className={`${btnSecondary} px-4 py-2`} onClick={() => setState('hidden')}>
              Later
            </button>
          </div>
        </>
      )}
    </div>
  )
}
