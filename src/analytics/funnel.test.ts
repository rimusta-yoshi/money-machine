import { describe, expect, it } from 'vitest'
import { FUNNEL_STEPS, funnel, ratio } from './funnel'

describe('funnel maths', () => {
  it('gives each step its share of the step before and of everyone who landed', () => {
    const rows = funnel({ landed: 200, started: 50, basics_done: 40, look_picked: 30, build_done: 20, preview_shared: 5, checkout_started: 10, paid: 8 })
    const r = Object.fromEntries(rows.map(x => [x.step, x]))
    expect(rows.map(x => x.step)).toEqual(FUNNEL_STEPS)
    expect(r.landed).toMatchObject({ count: 200, fromPrev: null, fromLanded: 1 })
    expect(r.started).toMatchObject({ fromPrev: 0.25, fromLanded: 0.25 })
    expect(r.basics_done).toMatchObject({ fromPrev: 0.8, fromLanded: 0.2 })
    expect(r.paid).toMatchObject({ fromPrev: 0.8, fromLanded: 0.04 })
  })

  it('measures the step after the optional preview from the step before it', () => {
    const r = Object.fromEntries(funnel({ landed: 10, build_done: 10, preview_shared: 2, checkout_started: 5 }).map(x => [x.step, x]))
    expect(r.preview_shared).toMatchObject({ optional: true, fromPrev: 0.2 })
    expect(r.checkout_started.fromPrev).toBe(0.5)
  })

  it('highlights the single biggest drop, never the optional preview step', () => {
    const rows = funnel({ landed: 100, started: 60, basics_done: 50, look_picked: 45, build_done: 40, preview_shared: 1, checkout_started: 30, paid: 3 })
    expect(rows.filter(x => x.biggestDrop).map(x => x.step)).toEqual(['paid'])
  })

  it('takes the first of two equal drops', () => {
    const rows = funnel({ landed: 100, started: 50, basics_done: 25, look_picked: 25, build_done: 25, checkout_started: 25, paid: 25 })
    expect(rows.filter(x => x.biggestDrop).map(x => x.step)).toEqual(['started'])
  })

  it('copes with nothing at all, and with steps that outnumber the one before', () => {
    const empty = funnel({})
    expect(empty.every(x => x.count === 0 && x.fromLanded === null && !x.biggestDrop)).toBe(true)
    expect(empty[1].fromPrev).toBeNull()
    // Returning builders can start without landing in the range: no drop, a share over 100%.
    const odd = funnel({ landed: 2, started: 4 })
    expect(odd[1].fromPrev).toBe(2)
    expect(odd.find(x => x.biggestDrop)?.step).toBe('basics_done')
  })

  it('never divides by zero', () => {
    expect(ratio(3, 0)).toBeNull()
    expect(ratio(0, 4)).toBe(0)
  })
})
