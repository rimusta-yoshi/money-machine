import { describe, expect, it } from 'vitest'
import { balancedVars, rowSizes, withRowVars } from './rows'

describe('balanced rows', () => {
  it('never leaves one item alone under fuller rows', () => {
    for (let max = 2; max <= 4; max++) {
      for (let n = 1; n <= 12; n++) {
        const rows = rowSizes(n, max)
        expect(rows.reduce((a, b) => a + b, 0), `${n} at ${max}`).toBe(n)
        expect(Math.max(...rows), `${n} at ${max}`).toBeLessThanOrEqual(max)
        // A row of one is only allowed first (a lead across the whole row) or when every row has one.
        const lone = rows.map((k, i) => (k === 1 ? i : -1)).filter(i => i >= 0)
        if (rows.length > 1) for (const i of lone) expect(i, `${n} at ${max}: ${rows}`).toBe(0)
        // Rows differ by at most one, apart from a lead.
        const rest = rows[0] === 1 && rows.length > 1 ? rows.slice(1) : rows
        expect(Math.max(...rest) - Math.min(...rest), `${n} at ${max}: ${rows}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('splits seven photos at three a row as 3 + 2 + 2', () => {
    expect(rowSizes(7, 3)).toEqual([3, 2, 2])
    expect(rowSizes(7, 4)).toEqual([4, 3])
    expect(rowSizes(7, 2)).toEqual([1, 2, 2, 2])
    expect(rowSizes(5, 1)).toEqual([1, 1, 1, 1, 1])
  })

  it('gives each item its row size for desktop and phone', () => {
    expect(balancedVars(3, 3, 2)).toEqual(['--sb-k:3;--sb-km:1;', '--sb-k:3;--sb-km:2;', '--sb-k:3;--sb-km:2;'])
  })

  it('adds the sizes to ready-made items, keeping their own styles', () => {
    expect(withRowVars(['<li class="a">x</li>', '<li data-over style="--sb-rot:3deg">y</li>'], 2, 1))
      .toBe('<li style="--sb-k:2;--sb-km:1;" class="a">x</li><li data-over style="--sb-k:2;--sb-km:1;--sb-rot:3deg">y</li>')
  })
})
