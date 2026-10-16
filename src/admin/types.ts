import type { FunnelRow, Step } from '../analytics/funnel'

/** What GET /v1/admin/stats answers (server/core/admin.ts). */

export interface BreakdownRow { key: string | null; counts: Partial<Record<Step, number>>; base: number; paid: number; conversion: number | null }

export interface Money {
  sales: number; revenue: number; refunds: number; refunded: number; disputes: number; lostToDisputes: number; net: number; refundRate: number | null
  stripeFees: number; feesUnknown: number; netAfterFees: number
}

export type SiteStatus = 'draft' | 'published' | 'paid' | 'disputed' | 'refunded'

export interface RecentSite {
  ref: string; status: SiteStatus; trade: string | null; theme: string | null; src: string | null; campaign: string | null
  createdAt: number; paidAt: number | null; url: string | null
}

export interface LayoutRow { section: string; label: string; total: number; layouts: { id: string; label: string; n: number; share: number | null }[] }

/** "My business isn't listed": one description and how often it was asked for. */
export interface RequestedType { text: string; count: number; closest: string | null; firstAt: number; lastAt: number }

/** Customers' own domains (all time), against Cloudflare's free allowance. */
export interface DomainStats {
  counts: Record<'pending' | 'active' | 'paused' | 'removing', number>
  freeLimit: number
  onCloudflare: number
  recent: {
    hostname: string; apex: string | null; status: 'pending' | 'active' | 'paused' | 'removing'; provider: string | null; oneClick: boolean
    createdAt: number; activeAt: number | null; siteUrl: string | null
  }[]
}

export interface Stats {
  range: { from: number; to: number; src: string | null }
  funnel: FunnelRow[]
  afterPaying: { refunded: number; disputed: number }
  breakdowns: { src: BreakdownRow[]; trade: BreakdownRow[]; theme: BreakdownRow[] }
  money: Money
  daily: { day: number; step: Step; n: number }[]
  recent: RecentSite[]
  layouts: LayoutRow[]
  sources: string[]
  /** All time, most asked first. Missing from a server older than the dashboard. */
  requested?: RequestedType[]
  /** Missing from a server older than the dashboard. */
  domains?: DomainStats
}

/** A site whose text has words worth a look (GET /v1/admin/review, server/core/review.ts). */
export interface ReviewSite {
  ref: string
  slug: string | null
  /** The business name, if the site was saved with one. */
  name: string | null
  words: string[]
  flaggedAt: number
  paid: boolean
  refunded: boolean
  /** Published at some point (paid, or with the admin key). Missing from an older server. */
  published?: boolean
  /** Taken down by an admin. Missing from an older server. */
  takenDown?: boolean
  /** The live site, only while it's live. */
  url: string | null
}

/** The source filter's value for visits with no source (matches server/core/admin.ts). */
export const DIRECT = '(direct)'

/** One take-down or restore (server/core/takedown.ts). */
export interface TakedownEntry { action: 'takedown' | 'restore'; at: number; by: string; reason: string | null }

/** A site found by address or reference (GET /v1/admin/sites/lookup), with its take-down record. */
export interface SiteSummary {
  ref: string
  name: string | null
  /** The free address, once it has one. */
  url: string | null
  ownDomain: { hostname: string; status: 'pending' | 'active' | 'paused' | 'removing' } | null
  /** The payment email, to reply to by hand. */
  email: string | null
  paid: boolean
  published: boolean
  refunded: boolean
  disputed: boolean
  disputeLost: boolean
  takenDown: boolean
  takedown: {
    takenDownAt: number | null; reason: string | null; by: string | null; restoredAt: number | null; restoredBy: string | null; log: TakedownEntry[]
  } | null
}

/** What a take-down or restore answers. */
export interface TakedownResult { site: SiteSummary; domainPaused?: boolean; domainResumed?: boolean; stillDown?: boolean }
