/** How the dashboard writes numbers, money, shares and dates. */

export const count = (n: number): string => n.toLocaleString('en-GB')

/** 0.256 → "26%", 0.04 → "4.0%"; null (nothing to divide by) → "–". */
export function pct(share: number | null): string {
  if (share === null) return '–'
  const p = share * 100
  return `${p >= 10 || p === 0 ? Math.round(p) : p.toFixed(1)}%`
}

/** Pence → "£1,234" or "£99.50"; negatives as "−£99". */
export function money(pence: number): string {
  const abs = Math.abs(pence)
  const pounds = (abs / 100).toLocaleString('en-GB', { minimumFractionDigits: abs % 100 ? 2 : 0, maximumFractionDigits: 2 })
  return `${pence < 0 ? '−' : ''}£${pounds}`
}

export const shortDate = (t: number): string => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const DAY_MS = 86_400_000

/** A server day number (days since 1970 in the admin's time zone) as "Mon 5 Oct". */
export const dayLabel = (day: number): string =>
  new Date(day * DAY_MS).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

/** "clean-pro" → "Clean pro"; null → the fallback. */
export function nice(id: string | null, fallback = '–'): string {
  if (!id) return fallback
  const words = id.replace(/[-_]+/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
