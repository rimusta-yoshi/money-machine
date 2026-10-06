import { HttpError } from './http'
import type { Deps } from './ports'

/** Size limits on what callers send. */
export const SIZE = {
  /** A site record without photos is a few KB; this leaves plenty of room. */
  record: 256 * 1024,
  /** The builder resizes to 1600px at 80%: well under 1 MB. */
  photo: 2 * 1024 * 1024,
  /** Photo uploads kept per draft (a site shows at most 14; the rest is room for changes of mind). */
  photosPerDraft: 60,
  smallJson: 4 * 1024,
  /** Stripe event bodies are a few KB. */
  webhook: 256 * 1024,
} as const

/** Requests per caller address per window, by action. */
export const RATE = {
  create: { limit: 20, windowSec: 3600 },
  save: { limit: 300, windowSec: 3600 },
  photo: { limit: 120, windowSec: 3600 },
  preview: { limit: 30, windowSec: 3600 },
  slug: { limit: 300, windowSec: 3600 },
  publish: { limit: 30, windowSec: 3600 },
  checkout: { limit: 20, windowSec: 3600 },
  /** Checkout status, polled every couple of seconds while a payment lands. */
  checkoutStatus: { limit: 600, windowSec: 3600 },
  refund: { limit: 30, windowSec: 3600 },
  /** "Lost your edit link?": each one sends an email. */
  editLink: { limit: 5, windowSec: 3600 },
  /** Preview pages render on every view. */
  previewView: { limit: 600, windowSec: 3600 },
} as const

export type RateKey = keyof typeof RATE

/** Counts this request and refuses it with 429 once the caller is over the limit. */
export async function rateLimit(deps: Deps, req: Request, action: RateKey): Promise<void> {
  const { limit, windowSec } = RATE[action]
  const nowSec = Math.floor(deps.now() / 1000)
  const windowStart = nowSec - (nowSec % windowSec)
  const count = await deps.db.hit(`${action}:${deps.clientIp(req)}`, windowStart)
  if (count > limit) {
    const retry = String(windowStart + windowSec - nowSec)
    throw new HttpError(429, 'rate_limited', 'Too many requests. Please wait a little and try again.', {}, { 'Retry-After': retry })
  }
}
