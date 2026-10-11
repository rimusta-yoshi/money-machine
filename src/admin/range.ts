/** The dashboard's date ranges, in the admin's own time zone. */

export type Preset = 'today' | '7d' | '30d' | 'all' | 'custom'

export const PRESETS: { id: Preset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
]

export interface Range { from: number; to: number }

const localDay = (t: number, daysLater = 0): number => {
  const d = new Date(t)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysLater).getTime()
}

/** "7 days" is today and the six days before it. */
export function presetRange(preset: Exclude<Preset, 'custom'>, now: number): Range {
  if (preset === 'all') return { from: 0, to: now }
  const back = preset === 'today' ? 0 : preset === '7d' ? 6 : 29
  return { from: localDay(now, -back), to: now }
}

/** A custom range from two yyyy-mm-dd dates, both days whole. Null if either is missing or they're the wrong way round. */
export function customRange(from: string, to: string): Range | null {
  const day = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null
  }
  const a = day(from)
  const b = day(to)
  if (a === null || b === null || a > b) return null
  return { from: a, to: localDay(b, 1) - 1 }
}

/** Minutes this clock is ahead of UTC at a moment (London in summer: 60). */
export const tzOffset = (t: number): number => -new Date(t).getTimezoneOffset()

/** yyyy-mm-dd for a date input. */
export function isoDay(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
