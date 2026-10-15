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
  /** "Download your site" (each site also has a daily allowance: export.ts). */
  download: { limit: 60, windowSec: 3600 },
  /** Preview pages render on every view. */
  previewView: { limit: 600, windowSec: 3600 },
  /** Connecting or disconnecting an own domain (each one calls Cloudflare and the DNS). */
  domain: { limit: 20, windowSec: 3600 },
  /** The own-domain page: on load, on coming back to it and on "Check now". */
  domainStatus: { limit: 300, windowSec: 3600 },
  /** The admin dashboard (also slows down guessing the admin key). */
  admin: { limit: 120, windowSec: 3600 },
  /** "Email me a link to finish on my computer": each one sends an email (each draft also has 3 a day: resume.ts). */
  resumeLink: { limit: 10, windowSec: 3600 },
  /** Opening a resume link (each one hands out a draft key). */
  resumeOpen: { limit: 30, windowSec: 3600 },
} as const

export type RateKey = keyof typeof RATE

export interface Window { limit: number; windowSec: number }

/** Counts one use of `key` in a fixed window. Within the limit: null; over it: seconds until the window ends. */
export async function overLimit(deps: Deps, key: string, { limit, windowSec }: Window): Promise<number | null> {
  const nowSec = Math.floor(deps.now() / 1000)
  const windowStart = nowSec - (nowSec % windowSec)
  const count = await deps.db.hit(key, windowStart)
  return count > limit ? windowStart + windowSec - nowSec : null
}

/** Counts this request and refuses it with 429 once the caller is over the limit. */
export async function rateLimit(deps: Deps, req: Request, action: RateKey): Promise<void> {
  const retry = await overLimit(deps, `${action}:${deps.clientIp(req)}`, RATE[action])
  if (retry !== null) {
    throw new HttpError(429, 'rate_limited', 'Too many requests. Please wait a little and try again.', {}, { 'Retry-After': String(retry) })
  }
}
