import { z } from 'zod'
import { funnel, ratio } from '../../src/analytics/funnel'
import type { Step } from '../../src/analytics/funnel'
import { cleanSource } from '../../src/analytics/source'
import { SECTION_KEYS } from '../../src/gen/core/types'
import { SECTIONS } from '../../src/gen/page'
import { siteOrigin } from './config'
import { domainStats } from './domainAdmin'
import { HttpError, json } from './http'
import { rateLimit } from './limits'
import type { Deps, Dimension, MoneyTotals, StatsQuery } from './ports'
import { REQUESTED_SHOWN } from './requested'
import { sameSecret } from './tokens'

/**
 * GET /v1/admin/stats: everything the admin dashboard shows, for a date range and ad source.
 * Needs the admin key (X-Admin-Key); the page itself sits behind Cloudflare Access.
 */

/** The source filter's value for visits with no source. */
export const DIRECT = '(direct)'
export const RECENT_SITES = 50
const DAILY_STEPS: readonly Step[] = ['landed', 'started', 'paid']
/** Each breakdown's conversion is paid ÷ the first step that knows the dimension. */
const BASE_STEP: Record<Dimension, Step> = { src: 'landed', trade: 'basics_done', theme: 'look_picked' }

export async function requireAdminKey(req: Request, deps: Deps): Promise<void> {
  const token = deps.config.adminToken
  if (!token) throw new HttpError(403, 'admin_closed', 'The dashboard is not switched on (no admin key is set).')
  const given = req.headers.get('X-Admin-Key') ?? ''
  if (!given) throw new HttpError(401, 'admin_key_needed', 'Enter the admin key.')
  if (!(await sameSecret(given, token))) throw new HttpError(403, 'not_allowed', 'That admin key is not right.')
}

const queryShape = z.object({
  from: z.coerce.number().int().min(0),
  to: z.coerce.number().int().min(0),
  src: z.string().max(60).optional(),
  /** Minutes the admin's clock is ahead of UTC (London in summer: 60). */
  tz: z.coerce.number().int().min(-840).max(840).default(0),
})

export function statsQuery(url: URL): StatsQuery & { tz: number } {
  const parsed = queryShape.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success || parsed.data.from > parsed.data.to) throw new HttpError(422, 'invalid_range', 'Choose a date range.')
  const { from, to, src, tz } = parsed.data
  return { from, to, tz, src: !src ? undefined : src === DIRECT ? null : cleanSource(src) ?? undefined }
}

export interface BreakdownRow { key: string | null; counts: Partial<Record<Step, number>>; base: number; paid: number; conversion: number | null }

/** One row per value (source, trade or theme) with its step counts, busiest first. */
export function breakdownRows(rows: { key: string | null; step: Step; n: number }[], base: Step): BreakdownRow[] {
  const byKey = rows.reduce((m, r) => m.set(r.key, { ...m.get(r.key), [r.step]: r.n }), new Map<string | null, Partial<Record<Step, number>>>())
  return [...byKey].map(([key, counts]) => {
    const b = counts[base] ?? 0
    const paid = counts.paid ?? 0
    return { key, counts, base: b, paid, conversion: ratio(paid, b) }
  }).sort((a, b) => b.base - a.base || b.paid - a.paid || String(a.key).localeCompare(String(b.key)))
}

export function moneySummary(m: MoneyTotals) {
  const refunded = m.refundedAmount + m.partialRefunded
  const net = m.revenue - refunded - m.lostToDisputes
  // Stripe keeps its fee when a payment is refunded, so fees come off whatever happened next.
  return { ...m, refunded, net, netAfterFees: net - m.stripeFees, refundRate: ratio(m.refunds, m.sales) }
}

export interface LayoutRow { section: string; label: string; total: number; layouts: { id: string; label: string; n: number; share: number | null }[] }

/** Every layout of every section with how often it was kept (never-picked ones too), most picked first. */
export function layoutRows(picks: { section: string; layout: string; n: number }[]): LayoutRow[] {
  return SECTION_KEYS.map(section => {
    const def = SECTIONS[section]
    const counts = new Map(picks.filter(p => p.section === section).map(p => [p.layout, p.n]))
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    const layouts = Object.entries(def.archetypes)
      .map(([id, a]) => ({ id, label: a.label, n: counts.get(id) ?? 0, share: ratio(counts.get(id) ?? 0, total) }))
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    return { section, label: def.label, total, layouts }
  })
}

export async function adminStats(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'admin')
  await requireAdminKey(req, deps)
  const q = statsQuery(new URL(req.url))
  const ins = deps.insights
  const [counts, bySrc, byTrade, byTheme, daily, picks, money, recent, sources, requested] = await Promise.all([
    ins.stepCounts(q), ins.breakdown(q, 'src'), ins.breakdown(q, 'trade'), ins.breakdown(q, 'theme'),
    ins.daily(q, DAILY_STEPS, q.tz), ins.picks(q), ins.money(q), ins.recentSites(q, RECENT_SITES), ins.sources(q),
    ins.requestedTypes(REQUESTED_SHOWN),
  ])
  const domains = await domainStats(deps)
  return json({
    range: { from: q.from, to: q.to, src: q.src === null ? DIRECT : q.src ?? null },
    funnel: funnel(counts),
    afterPaying: { refunded: counts.refunded ?? 0, disputed: counts.disputed ?? 0 },
    breakdowns: {
      src: breakdownRows(bySrc, BASE_STEP.src), trade: breakdownRows(byTrade, BASE_STEP.trade), theme: breakdownRows(byTheme, BASE_STEP.theme),
    },
    money: moneySummary(money),
    currency: deps.config.currency,
    daily,
    recent: recent.map(s => ({ ...s, url: s.slug ? `${siteOrigin(deps.config, s.slug)}/` : null })),
    layouts: layoutRows(picks),
    sources,
    // All time, whatever the date range: there are few, and each one matters.
    requested,
    // All time too: every customer domain on Cloudflare, against the free allowance.
    domains,
  })
}
