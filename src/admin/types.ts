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
}

/** The source filter's value for visits with no source (matches server/core/admin.ts). */
export const DIRECT = '(direct)'
