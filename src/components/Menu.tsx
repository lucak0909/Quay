import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
}

// A "⋯" button that opens a short list of actions. `extra` renders above the items (e.g. colour swatches).
export default function Menu({ label, items, extra }: { label: string; items: MenuItem[]; extra?: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-slate-500 transition hover:bg-white/70 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="glass-thick absolute right-0 z-20 mt-1.5 w-56 rounded-2xl p-1.5 text-sm"
        >
          {extra?.(close)}
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                close()
                item.onSelect()
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left hover:bg-black/[.05] dark:hover:bg-white/10 ${item.danger ? 'text-red-600 dark:text-red-300' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
