import { DAY, MINUTE } from './scheduler'

// Short "comes back in…" label for an answer button, like Anki: <1m, 10m, 3h, 1d, 12d, 2mo, 1.5y.
export function formatInterval(ms: number): string {
  if (ms < MINUTE) return '<1m'
  if (ms < 60 * MINUTE) return `${Math.round(ms / MINUTE)}m`
  if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))}h`
  const days = ms / DAY
  if (days < 30) return `${Math.round(days)}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  const years = Math.round((days / 365) * 10) / 10
  return `${years}y`
}
