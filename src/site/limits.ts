/**
 * Longest text each field may hold: what the generated layouts can fit without breaking
 * (headings stay within their line limits, nothing runs off a phone screen). The layouts
 * test checks every section still has a passing option with every field at its limit;
 * the fallback layout stays as a safety net.
 */
export const LIMITS = {
  name: 40,
  /** Unchanged from v2: cutting a phone number would change who gets called. */
  phone: 30,
  /** Appears in headings ("Local plumber in …", "Covering …"). */
  location: 32,
  about: 280,
  yearsInBusiness: 4,
  email: 254,
  jobsDone: 10,
  badge: 40,
  area: 28,
  reviewText: 280,
  reviewAuthor: 40,
  reviewLocation: 32,
  hoursDay: 20,
  hoursTime: 24,
  photoAlt: 160,
} as const

export type LimitKey = keyof typeof LIMITS

/** Show the counter once this much of the limit is used, so short fields stay quiet. */
export const COUNTER_FROM = 0.7
