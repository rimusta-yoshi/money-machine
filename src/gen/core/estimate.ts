import type { Measurer } from './types'

/**
 * The measurer for places without a DOM (tests, the builder's first guesses): each
 * section's own pessimistic estimate. Overlapping decorations can't be placed without a
 * layout engine; the builder measures every section in the browser before the finish step,
 * so a default that turns out to cover text is repaired before anything is published.
 */
export const estimateMeasurer: Measurer = { measure: input => input.estimate() }

/**
 * The estimator for publishing, which never measures: any layout with an overlapping
 * decoration counts as covering text, since only a real browser can clear those. Only used
 * for a section that somehow reached publishing without a measured spec in the record.
 */
export const cautiousMeasurer: Measurer = {
  measure: input => {
    const m = input.estimate()
    return input.render().includes('data-over') ? { ...m, coveredText: Math.max(1, m.coveredText) } : m
  },
}
