import type { Config } from './config'

/**
 * Everything the server needs from its host, as plain interfaces. The Cloudflare adapter
 * (server/cloudflare) implements them with D1, R2 and Workers assets; another host would
 * implement them with SQLite and any S3-compatible store. Nothing in server/core knows which.
 */

export interface Payment {
  sessionId: string
  paymentIntent: string
  /** Pence. */
  amount: number
  currency: string
  email: string
  paidAt: number
}

export interface DraftRow {
  /** Random id used in storage paths. Not a secret: the browser holds a separate key. */
  ref: string
  /** The validated site record as JSON, or null until a preview or checkout sends it. */
  record: string | null
  /** The address it's published at, if it is. */
  slug: string | null
  updatedAt: number
  publishedAt: number | null
  /** Set once a checkout completes. */
  payment: Payment | null
  welcomeSentAt: number | null
  refundedAt: number | null
  /** Signed into edit links; bumping it cuts off the old ones. */
  linkVersion: number
}

export interface CheckoutRow {
  sessionId: string
  ref: string
  slug: string
  email: string
  /** The checked record this checkout publishes. */
  record: string
  createdAt: number
  expiresAt: number
}

/** The database: drafts, payments, preview links, claimed addresses and rate-limit counters. */
export interface Database {
  createDraft(d: { ref: string; keyHash: string; now: number }): Promise<void>
  draftByKey(keyHash: string): Promise<DraftRow | null>
  draftByRef(ref: string): Promise<DraftRow | null>
  draftByPaymentIntent(paymentIntent: string): Promise<DraftRow | null>
  /** Paid sites (refunded ones too) whose payment email is this. */
  paidDraftsByEmail(email: string): Promise<DraftRow[]>
  saveRecord(ref: string, record: string, now: number): Promise<void>
  /** Notes the builder used this draft (at most one write a day), so cleanup leaves it alone. */
  touch(ref: string, now: number): Promise<void>
  createPreview(p: { tokenHash: string; ref: string; now: number; expiresAt: number }): Promise<void>
  /** The draft a live (unexpired) preview token points at. */
  previewRef(tokenHash: string, now: number): Promise<string | null>
  /** Which draft holds an address, if any (an expired hold counts as free). */
  slugOwner(slug: string, now: number): Promise<string | null>
  /**
   * Claims an address for a draft: for good (heldUntil null) or as a hold while a checkout is
   * open. False if another draft holds it. A draft's own permanent claim is never shortened.
   */
  claimSlug(slug: string, ref: string, now: number, heldUntil?: number | null): Promise<boolean>
  releaseSlug(slug: string, ref: string): Promise<void>
  /** Records the address it's live at, and releases any other address the draft holds. False if the site was refunded meanwhile. */
  markPublished(ref: string, slug: string, now: number): Promise<boolean>
  createCheckout(c: CheckoutRow): Promise<void>
  checkout(sessionId: string): Promise<CheckoutRow | null>
  /** Records the payment once. True if this call recorded it, false if it was already paid. */
  markPaid(ref: string, p: Payment): Promise<boolean>
  /** Claims sending the welcome email. True for the one caller that should send it. */
  claimWelcome(ref: string, now: number): Promise<boolean>
  /** Gives the claim back after a failed send, so a retry sends it. */
  releaseWelcome(ref: string): Promise<void>
  /** A new link version (old edit links stop working). */
  bumpLinkVersion(ref: string): Promise<number>
  /** Drops this draft's other address holds: one open checkout's address at a time. */
  releaseHolds(ref: string, except: string): Promise<void>
  /** Marks the site refunded once. True if this call did it. */
  markRefunded(ref: string, now: number, refundId: string | null): Promise<boolean>
  /** Stripe events: true if this id was handled already. */
  eventSeen(id: string): Promise<boolean>
  recordEvent(id: string, type: string, now: number): Promise<void>
  /** Unpaid, never published drafts not used since `before`, oldest first. */
  staleDrafts(before: number, limit: number): Promise<string[]>
  /** Deletes those still unpaid, unpublished and unused since `before`; returns the ones deleted. */
  deleteDrafts(refs: readonly string[], before: number): Promise<string[]>
  /** Which of these refs still exist. */
  existingRefs(refs: readonly string[]): Promise<Set<string>>
  /** Counts one request against a key in a fixed window; returns the count so far. */
  hit(key: string, windowStart: number): Promise<number>
  /** Housekeeping: drops expired preview links, old counters, old checkouts and old event ids. */
  sweep(now: number): Promise<void>
}

export interface StoredObject {
  body: ReadableStream | ArrayBuffer
  contentType: string
  etag: string
  size: number
}

/** Object storage: draft photos, published sites and the builder's sample photos. */
export interface Blobs {
  put(key: string, body: ArrayBuffer | Uint8Array | string, contentType: string): Promise<void>
  get(key: string): Promise<StoredObject | null>
  /** Every key under a prefix. */
  list(prefix: string): Promise<string[]>
  delete(keys: readonly string[]): Promise<void>
}

/** Files deployed with the code: the self-hosted fonts and their licences. */
export interface Assets {
  font(name: string): Promise<Response | null>
}

/** Card payments (Stripe Checkout). Card details never reach us. */
export interface Payments {
  createCheckout(c: {
    ref: string; slug: string; email: string; amount: number; currency: string; productName: string
    successUrl: string; cancelUrl: string; expiresAt: number
  }): Promise<{ id: string; url: string }>
  /** Refunds a payment in full. The same idempotency key never refunds twice. */
  refund(paymentIntent: string, idempotencyKey: string): Promise<{ id: string }>
  /** Stripe's receipt page for a payment, if it has one. */
  receiptUrl(paymentIntent: string): Promise<string | null>
}

export interface Email {
  to: string
  subject: string
  html: string
  text: string
}

/** Sends email (Resend, or the log when no key is set). */
export interface Mailer {
  send(email: Email): Promise<void>
}

export interface Deps {
  config: Config
  db: Database
  blobs: Blobs
  assets: Assets
  /** Null when payments are off (no Stripe keys). */
  payments: Payments | null
  mailer: Mailer
  now: () => number
  /** The caller's address, for rate limits. */
  clientIp: (req: Request) => string
}
