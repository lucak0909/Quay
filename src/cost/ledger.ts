import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SpendEntry } from '../db'
import { monthKey } from './budget'

export function recordSpend(entry: Omit<SpendEntry, 'id' | 'at' | 'month'>) {
  const now = new Date()
  return db.spend.add({ ...entry, at: now.getTime(), month: monthKey(now) })
}

export function useMonthSpend(): number | undefined {
  return useLiveQuery(async () => {
    const entries = await db.spend.where('month').equals(monthKey(new Date())).toArray()
    return entries.reduce((sum, e) => sum + e.cost, 0)
  })
}
