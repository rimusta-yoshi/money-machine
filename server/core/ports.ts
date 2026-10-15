import type { Source } from '../../src/analytics/source'
import type { Step } from '../../src/analytics/funnel'
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
  /** Edit links issued so far after the welcome email's (number 0); each new one is numbered. */
  linksIssued: number
  /** Edit links numbered below this no longer work. */
  linkFloor: number
  /** A payment dispute is open (or was lost): the site is down. */
  disputedAt: number | null
  disputeLostAt: number | null
  /** Pence refunded by partial refunds so far. */
  refundedAmount: number | null
  /** The ad or link the site came from, if known. */
  source: Source
}

/** A site flagged for review (server/core/reviewWords.ts). */
export interface ReviewRow {
  ref: string
  slug: string | null
  /** The business name in the saved record, if any. */
  name: string | null
  words: string[]
  flaggedAt: number
  paid: boolean
  refunded: boolean
  /** Published at some point (paid, or with the admin key). */
  published: boolean
  /** Live now: published, not refunded, no dispute open or lost. */
  live: boolean
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
  createDraft(d: { ref: string; keyHash: string; now: number; source: Source }): Promise<void>
  /** The draft whose key (or second key, from a resume link) has this hash. */
  draftByKey(keyHash: string): Promise<DraftRow | null>
  /** The draft whose last replaced second key has this hash (a newer resume link was opened, or it was paid for). */
  draftByReplacedKey(keyHash: string): Promise<DraftRow | null>
  /**
   * Makes this second key the draft's main key and the main key its second (the device that
   * checks out keeps editing after paying). Nothing changes if it isn't the second key.
   */
  promoteKey(ref: string, keyHash: string): Promise<void>
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
  /**
   * Records the address it's live at, and releases any other address the draft holds (and any
   * resume link email). False if the site was refunded or disputed meanwhile.
   */
  markPublished(ref: string, slug: string, now: number): Promise<boolean>
  createCheckout(c: CheckoutRow): Promise<void>
  checkout(sessionId: string): Promise<CheckoutRow | null>
  /**
   * Records the payment once. True if this call recorded it, false if it was already paid. The
   * second key (from a resume link) stops working, and any resume link email is forgotten.
   */
  markPaid(ref: string, p: Payment): Promise<boolean>
  /** Claims sending the welcome email. True for the one caller that should send it. */
  claimWelcome(ref: string, now: number): Promise<boolean>
  /** Gives the claim back after a failed send, so a retry sends it. */
  releaseWelcome(ref: string): Promise<void>
  /** Issues the next edit link number. Older links keep working until a newer one is opened. */
  issueEditLink(ref: string): Promise<number>
  /** Cuts off edit links numbered below n (never lowers it). */
  raiseLinkFloor(ref: string, n: number): Promise<void>
  /** Marks a dispute open once. True if this call did it. */
  markDisputed(ref: string, now: number): Promise<boolean>
  /** Closes the open dispute: won clears it (true if this call did), lost records it and the site stays down. */
  endDispute(ref: string, won: boolean, now: number): Promise<boolean>
  recordPartialRefund(ref: string, amountRefunded: number): Promise<void>
  /** Stripe's fee on the site's payment (pence). */
  recordFee(ref: string, fee: number): Promise<void>
  /** Paid sites whose Stripe fee isn't known yet, oldest first. */
  paidWithoutFee(limit: number): Promise<{ ref: string; paymentIntent: string }[]>
  /** Frees the addresses of sites refunded, or whose dispute was lost, before `before`; returns them. */
  releaseEndedSlugs(before: number): Promise<string[]>
  /** Drops this draft's other address holds: one open checkout's address at a time. */
  releaseHolds(ref: string, except: string): Promise<void>
  /** Marks the site refunded once. True if this call did it. */
  markRefunded(ref: string, now: number, refundId: string | null): Promise<boolean>
  /** Every site that was published or paid for (refunded ones too), newest first. */
  sites(): Promise<(DraftRow & { createdAt: number })[]>
  /**
   * Deletes a draft for good, with its previews, addresses, checkouts and dashboard rows
   * (test sites before launch). Returns every address it held, for their files to go too.
   */
  deleteDraft(ref: string): Promise<string[]>
  /** Stripe events: true if this id was handled already. */
  eventSeen(id: string): Promise<boolean>
  recordEvent(id: string, type: string, now: number): Promise<void>
  /** Unpaid, never published drafts not used since `before`, oldest first. */
  staleDrafts(before: number, limit: number): Promise<string[]>
  /** Deletes those still unpaid, unpublished and unused since `before`; returns the ones deleted. */
  deleteDrafts(refs: readonly string[], before: number): Promise<string[]>
  /** Which of these refs still exist. */
  existingRefs(refs: readonly string[]): Promise<Set<string>>
  /**
   * "Email me a link": records where to send it and when to remind (null: no reminder), counting
   * it against the draft's allowance of `perDay` sends in 24 hours, and numbers the new link (older
   * ones stop working). The new link's number, or null (nothing recorded) if the allowance is used
   * up or the draft is paid.
   */
  recordResumeLink(ref: string, r: { email: string; now: number; remindAt: number | null; perDay: number }): Promise<number | null>
  /**
   * Uses up resume link number n, if it's still the latest and the draft unpaid: the draft gets
   * this second key (the one it replaces is remembered, to say why it stopped). True if it did.
   */
  useResumeLink(ref: string, n: number, keyHash: string): Promise<boolean>
  /** Unpaid, unpublished, unrefunded drafts whose one reminder is due and not yet sent. */
  dueReminders(now: number, limit: number): Promise<{ ref: string; email: string }[]>
  /**
   * Claims sending a draft's reminder (only ever once), numbering its fresh link. The link's number
   * for the one caller that should send it, else null.
   */
  claimReminder(ref: string, now: number): Promise<number | null>
  /**
   * Flags a site for review with the words found. Text already flagged (same fingerprint) changes
   * nothing, so a site marked reviewed stays so until its text changes.
   */
  flagReview(ref: string, f: { words: string[]; fingerprint: string; now: number }): Promise<void>
  /** Flagged sites not marked reviewed since, newest flag first. */
  sitesToReview(limit: number): Promise<ReviewRow[]>
  /** "Mark reviewed". False if there's no such flagged site. */
  clearReview(ref: string, now: number): Promise<boolean>
  /** Counts one request against a key in a fixed window; returns the count so far. */
  hit(key: string, windowStart: number): Promise<number>
  /** Housekeeping: drops expired preview links, old counters, old checkouts and old event ids. */
  sweep(now: number): Promise<void>
}

/** One funnel step reached. Anonymous: a site's random id at most, never anything about the person. */
export interface EventRow {
  step: Step
  at: number
  trade: string | null
  theme: string | null
  src: string | null
  campaign: string | null
  /** The site's random id, once the builder has one. */
  ref: string | null
}

/** One layout kept in one section. */
export interface PickRow {
  at: number
  section: string
  layout: string
  theme: string | null
  trade: string | null
  src: string | null
  ref: string | null
}

/** "My business isn't listed": one request, already cleaned. */
export interface RequestedTypeRow {
  text: string
  /** The business type we suggested, if any. */
  closest: string | null
  at: number
}

/** A requested business type with how many times it was asked for. */
export interface RequestedType {
  text: string
  count: number
  closest: string | null
  firstAt: number
  lastAt: number
}

/** A date range (ms, inclusive) and an ad source: undefined for every source, null for none (direct). */
export interface StatsQuery {
  from: number
  to: number
  src?: string | null
}

export type Dimension = 'src' | 'trade' | 'theme'

export interface MoneyTotals {
  sales: number
  /** Pence. */
  revenue: number
  refunds: number
  refundedAmount: number
  /** Pence given back by partial refunds on sales in the range. */
  partialRefunded: number
  disputes: number
  /** Pence lost to disputes the bank decided against us. */
  lostToDisputes: number
  /** Stripe's fees on sales in the range (pence), as far as known. */
  stripeFees: number
  /** Sales in the range whose fee isn't known yet. */
  feesUnknown: number
}

export type SiteStatus = 'draft' | 'published' | 'paid' | 'disputed' | 'refunded'

export interface RecentSite {
  ref: string
  status: SiteStatus
  trade: string | null
  theme: string | null
  src: string | null
  campaign: string | null
  createdAt: number
  paidAt: number | null
  /** The live address, while it's live. */
  slug: string | null
}

/** The dashboard's store: anonymous events in, counts out. */
export interface Insights {
  /** Records a step. A site's step is recorded once (the first time it's reached). */
  addEvent(e: EventRow): Promise<void>
  addPick(p: PickRow): Promise<void>
  stepCounts(q: StatsQuery): Promise<Partial<Record<Step, number>>>
  breakdown(q: StatsQuery, by: Dimension): Promise<{ key: string | null; step: Step; n: number }[]>
  /** Counts per day; days start at local midnight, `offsetMinutes` ahead of UTC. */
  daily(q: StatsQuery, steps: readonly Step[], offsetMinutes: number): Promise<{ day: number; step: Step; n: number }[]>
  picks(q: StatsQuery): Promise<{ section: string; layout: string; n: number }[]>
  money(q: StatsQuery): Promise<MoneyTotals>
  recentSites(q: StatsQuery, limit: number): Promise<RecentSite[]>
  /** The ad sources seen in the range (ignoring the source filter), busiest first, for the filter. */
  sources(q: StatsQuery): Promise<string[]>
  /** Counts one "My business isn't listed" request (the same text adds to its count). */
  addRequestedType(r: RequestedTypeRow): Promise<void>
  /** The most requested business types (all time), most asked for first. */
  requestedTypes(limit: number): Promise<RequestedType[]>
  /** Deletes events and picks older than `before`, and requested types not asked for since. */
  forgetBefore(before: number): Promise<void>
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
  /** Stripe's fee on a payment (pence), or null if Stripe hasn't settled it yet. */
  fee(paymentIntent: string): Promise<number | null>
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

/**
 * A customer's own domain: pending (waiting for their DNS record), active (live), paused (a
 * payment dispute is open: off Cloudflare, kept here to put back) or removing (Cloudflare
 * still to be told: the cron retries).
 */
export type DomainStatus = 'pending' | 'active' | 'paused' | 'removing'

/** A customer's own domain (table custom_domains). One per site. */
export interface DomainRow {
  ref: string
  /** What visitors use and we serve: www.example.co.uk (or the subdomain they chose). */
  hostname: string
  /** The registered domain: example.co.uk. */
  domain: string
  /** The bare domain when it's connected too (DNS on Cloudflare only): it redirects to hostname. */
  apex: string | null
  cfId: string | null
  cfApexId: string | null
  status: DomainStatus
  /** The domain company, from its nameservers (src/domains/providers.ts), if known. */
  provider: string | null
  /** One-click connecting (Domain Connect), when the DNS provider offers our template. */
  dc: DnsProviderInfo | null
  /** Where the hostname pointed at the last check (a CNAME target), if anywhere. */
  dnsSeen: string | null
  /** Cloudflare's ownership TXT record the customer adds alongside the CNAME. */
  verify: { name: string; value: string } | null
  /** When we saw that TXT record in public DNS. Nothing is served at the domain before. */
  verifiedAt: number | null
  createdAt: number
  checkedAt: number | null
  activeAt: number | null
  liveEmailAt: number | null
}

/** A domain with its site's address and payment email, for the site worker, the cron and the dashboard. */
export interface DomainWithSite extends DomainRow {
  slug: string | null
  email: string | null
  /** The site has a live, paying customer: paid, published, not refunded, no dispute. */
  siteLive: boolean
}

export type DomainPatch = Partial<Pick<DomainRow, 'apex' | 'cfId' | 'cfApexId' | 'status' | 'dnsSeen' | 'verify' | 'verifiedAt' | 'checkedAt' | 'activeAt'>>

/** Customers' own domains, on the same database. */
export interface DomainStore {
  byRef(ref: string): Promise<DomainRow | null>
  /** The domain whose hostname or bare domain this is, with its site. */
  byHost(host: string): Promise<DomainWithSite | null>
  /** The live domain of the site at this address, if it has one. */
  activeHostForSlug(slug: string): Promise<string | null>
  /** Adds one (pending). False if the site has one already or the name is another site's. */
  insert(row: Pick<DomainRow, 'ref' | 'hostname' | 'domain' | 'apex' | 'provider' | 'dc' | 'createdAt'>): Promise<boolean>
  /**
   * Changes a domain, only while its status is still `expected` (when given): a page, the cron
   * and a webhook may all be at the same domain. True if it changed.
   */
  update(ref: string, patch: DomainPatch, expected?: DomainStatus): Promise<boolean>
  /** Claims the "your domain is live" email. True for the one caller that should send it. */
  claimLiveEmail(ref: string, now: number): Promise<boolean>
  delete(ref: string): Promise<void>
  /** Domains in these states not checked since `before`, oldest check first. */
  due(statuses: readonly DomainStatus[], before: number, limit: number): Promise<DomainWithSite[]>
  /** Domains to take off Cloudflare: their site is gone, refunded or lost a dispute, or they're being removed. */
  ended(limit: number): Promise<DomainWithSite[]>
  /** Domains still on Cloudflare whose site has a dispute open: to pause. */
  disputed(limit: number): Promise<DomainWithSite[]>
  /** Paused domains whose site is live again (a dispute won): to put back. */
  resumable(limit: number): Promise<DomainWithSite[]>
  counts(): Promise<Record<DomainStatus, number>>
  /** Every domain, newest first (the dashboard). */
  list(limit: number): Promise<DomainWithSite[]>
}

/** What Cloudflare says about one custom hostname. */
export interface HostnameInfo {
  id: string
  hostname: string
  /** pending, active, moved, deleted, blocked… */
  status: string
  /** The HTTPS certificate: initializing, pending_validation, active… */
  sslStatus: string | null
  /** The TXT record proving ownership (Cloudflare's ownership_verification), if it gave one. */
  verify: { name: string; value: string } | null
}

/** Cloudflare for SaaS custom hostnames on our zone. */
export interface CustomHostnames {
  create(hostname: string): Promise<HostnameInfo>
  /** Null if Cloudflare has no such hostname (any more). */
  get(id: string): Promise<HostnameInfo | null>
  find(hostname: string): Promise<HostnameInfo | null>
  /** Removing one that's already gone is fine. */
  remove(id: string): Promise<void>
}

export type DnsType = 'NS' | 'TXT' | 'CNAME'

/** Public DNS lookups (DNS over HTTPS). */
export interface Dns {
  /** nxdomain: the name doesn't exist; error: couldn't tell. */
  lookup(name: string, type: DnsType): Promise<{ status: 'ok' | 'nxdomain' | 'error'; answers: string[] }>
}

/** A DNS provider that offers one-click connecting (Domain Connect) with our template. */
export interface DnsProviderInfo {
  /** Their Domain Connect id, as their settings give it. */
  providerId: string
  /** What to call them: "GoDaddy". */
  name: string
  /** Their urlSyncUX: where the customer approves the change. */
  syncUx: string
}

/** Domain Connect discovery: who runs a domain's DNS, and whether they take our template. */
export interface DomainConnect {
  /** Null when the provider doesn't support it, isn't switched on for us, or can't be reached. */
  discover(domain: string): Promise<DnsProviderInfo | null>
}

export interface Deps {
  config: Config
  db: Database
  domains: DomainStore
  /** Null when own domains aren't switched on (no Cloudflare token). */
  saas: CustomHostnames | null
  dns: Dns
  /** Null when one-click connecting is switched off for every provider. */
  domainConnect: DomainConnect | null
  insights: Insights
  blobs: Blobs
  assets: Assets
  /** Null when payments are off (no Stripe keys). */
  payments: Payments | null
  mailer: Mailer
  now: () => number
  /** The caller's address, for rate limits. */
  clientIp: (req: Request) => string
  /** Runs work after the response has gone (event recording): never awaited, failures only logged. */
  later: (work: Promise<unknown>) => void
  /** Whether to record a builder event from this caller (a per-address limit kept by the host, never stored). */
  allowEvent: (req: Request) => Promise<boolean>
}
