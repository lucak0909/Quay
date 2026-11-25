export const DEFAULT_MONTHLY_BUDGET = 5
export const DEFAULT_CONFIRM_THRESHOLD = 0.25
export const WARN_FRACTION = 0.8

export type BudgetStatus = 'ok' | 'warn' | 'over'

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthSpend(entries: { month: string; cost: number }[], now: Date): number {
  const key = monthKey(now)
  return entries.filter((e) => e.month === key).reduce((sum, e) => sum + e.cost, 0)
}

// A budget of 0 or less means "no budget set".
export function checkBudget(spentThisMonth: number, requestMaxCost: number | null, budget: number): BudgetStatus {
  if (budget <= 0) return 'ok'
  if (spentThisMonth >= budget) return 'over'
  if (requestMaxCost === null) return spentThisMonth >= budget * WARN_FRACTION ? 'warn' : 'ok'
  const after = spentThisMonth + requestMaxCost
  if (after > budget) return 'over'
  if (after >= budget * WARN_FRACTION) return 'warn'
  return 'ok'
}

export function needsExtraConfirm(requestMaxCost: number | null, threshold: number): boolean {
  return requestMaxCost === null || requestMaxCost > threshold
}
