import type { Measurer } from './types'

/** The measurer for places without a DOM (tests, a Worker): each section's own pessimistic estimate. */
export const estimateMeasurer: Measurer = { measure: input => input.estimate() }
