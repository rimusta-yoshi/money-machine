import { describe, expect, it } from 'vitest'
import { customRange, isoDay, presetRange } from './range'
import { dayLabel, money, nice, pct } from './format'

const NOW = new Date(2026, 9, 11, 15, 30).getTime()

describe('date ranges', () => {
  it('starts today, 7 days and 30 days at local midnight, and ends now', () => {
    expect(presetRange('today', NOW)).toEqual({ from: new Date(2026, 9, 11).getTime(), to: NOW })
    expect(presetRange('7d', NOW).from).toBe(new Date(2026, 9, 5).getTime())
    expect(presetRange('30d', NOW).from).toBe(new Date(2026, 8, 12).getTime())
    expect(presetRange('all', NOW)).toEqual({ from: 0, to: NOW })
  })

  it('takes whole days for a custom range, and refuses one the wrong way round', () => {
    expect(customRange('2026-10-01', '2026-10-03')).toEqual({ from: new Date(2026, 9, 1).getTime(), to: new Date(2026, 9, 4).getTime() - 1 })
    expect(customRange('2026-10-03', '2026-10-01')).toBeNull()
    expect(customRange('', '2026-10-01')).toBeNull()
    expect(isoDay(NOW)).toBe('2026-10-11')
  })
})

describe('formatting', () => {
  it('writes shares, money and labels plainly', () => {
    expect(pct(0.256)).toBe('26%')
    expect(pct(0.04)).toBe('4.0%')
    expect(pct(0)).toBe('0%')
    expect(pct(null)).toBe('–')
    expect(money(9900)).toBe('£99')
    expect(money(123450)).toBe('£1,234.50')
    expect(money(-9900)).toBe('−£99')
    expect(nice('clean-pro')).toBe('Clean pro')
    expect(nice(null, 'Direct')).toBe('Direct')
    expect(dayLabel(Date.UTC(2026, 9, 5) / 86_400_000)).toBe('Mon 5 Oct')
  })
})
