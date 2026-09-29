import type { Measurer } from './types'

/**
 * The measurer for places without a DOM (tests, a Worker, publishing defaults): each
 * section's own pessimistic estimate. It can't see where overlapping decorations land, so
 * any layout that has one counts as covering text; only a real browser can clear those.
 */
export const estimateMeasurer: Measurer = {
  measure: input => {
    const m = input.estimate()
    return input.render().includes('data-over') ? { ...m, coveredText: Math.max(1, m.coveredText) } : m
  },
}
