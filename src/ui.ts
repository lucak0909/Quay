// Shared class names for the liquid-glass look. Surfaces are defined in index.css.
const control =
  'inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm transition duration-150 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100'

export const btn = `${control} glass-accent font-semibold text-white hover:brightness-110`
export const btnSecondary = `${control} glass font-medium text-slate-800 hover:bg-white/80 dark:text-slate-100 dark:hover:bg-white/15`
export const btnDanger = `${control} glass font-medium text-red-600 hover:bg-red-50/80 dark:text-red-300 dark:hover:bg-red-500/15`
export const input =
  'w-full rounded-2xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm shadow-[inset_0_1px_2px_rgb(15_23_42/0.06)] placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-400/20 dark:border-white/10 dark:bg-white/[.06] dark:placeholder:text-slate-500'
export const panel = 'glass rounded-3xl p-5'
export const muted = 'text-sm text-slate-500 dark:text-slate-400'
export const link = 'font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200'
export const title = 'text-3xl font-bold tracking-tight'
const box = 'rounded-2xl border p-3.5 text-sm'
export const warnBox = `${box} border-amber-300/70 bg-amber-50/75 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200`
export const errorBox = `${box} border-red-300/70 bg-red-50/75 text-red-900 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-200`
export const okBox = `${box} border-emerald-300/70 bg-emerald-50/75 text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200`
