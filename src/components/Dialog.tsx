import { useEffect, useRef, type ReactNode } from 'react'

// A small in-page dialog (native <dialog>, so Escape and focus work as expected).
export default function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  )
}
