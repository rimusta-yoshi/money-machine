/**
 * Switches for features that exist in code but aren't ready for customers.
 * Flip one here and everything that depends on it follows.
 */
export interface Features {
  /** Enquiry forms that actually send (Phase 3). Gates the hero's Contact-panel layout. */
  enquiries: boolean
}

export const FEATURES: Features = {
  enquiries: false,
}
