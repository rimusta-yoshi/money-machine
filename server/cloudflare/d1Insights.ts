import type { Step } from '../../src/analytics/funnel'
import type { Dimension, Insights, MoneyTotals, RecentSite, SiteStatus, StatsQuery } from '../core/ports'

/** The dashboard's counts, on D1 (SQLite). Plain SQL, like d1.ts. */

const DAY_MS = 24 * 60 * 60 * 1000
/** Columns a breakdown may group by (never taken from the caller as text). */
const MAX_SOURCES = 50
const DIMENSION_COLUMN: Record<Dimension, string> = { src: 'src', trade: 'trade', theme: 'theme' }

interface Filter { sql: string; values: unknown[] }

/** The date range on `at`, and the source on `src` (null: direct, no source). */
function filter(q: StatsQuery, at: string, src = 'src'): Filter {
  const parts = [`${at} >= ?`, `${at} <= ?`]
  const values: unknown[] = [q.from, q.to]
  if (q.src === null) parts.push(`${src} IS NULL`)
  else if (q.src !== undefined) {
    parts.push(`${src} = ?`)
    values.push(q.src)
  }
  return { sql: parts.join(' AND '), values }
}

interface SiteDbRow {
  ref: string; slug: string | null; created_at: number; paid_at: number | null; published_at: number | null; refunded_at: number | null
  disputed_at: number | null; dispute_lost_at: number | null; src: string | null; campaign: string | null; trade: unknown; theme: unknown
}

function status(r: SiteDbRow): SiteStatus {
  if (r.refunded_at !== null) return 'refunded'
  if (r.disputed_at !== null || r.dispute_lost_at !== null) return 'disputed'
  if (r.paid_at !== null) return 'paid'
  return r.published_at !== null ? 'published' : 'draft'
}

const text = (v: unknown): string | null => (typeof v === 'string' ? v : null)

function toSite(r: SiteDbRow): RecentSite {
  const s = status(r)
  const live = (s === 'paid' || s === 'published') && r.published_at !== null
  return {
    ref: r.ref, status: s, trade: text(r.trade), theme: text(r.theme), src: r.src, campaign: r.campaign,
    createdAt: r.created_at, paidAt: r.paid_at, slug: live ? r.slug : null,
  }
}

export function d1Insights(db: D1Database): Insights {
  const all = async <T>(sql: string, values: unknown[]): Promise<T[]> => (await db.prepare(sql).bind(...values).all<T>()).results
  const one = async <T>(sql: string, values: unknown[]): Promise<T> => (await db.prepare(sql).bind(...values).first<T>())!

  return {
    async addEvent(e) {
      await db.prepare(
        `INSERT INTO events (step, at, trade, theme, src, campaign, ref) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
         WHERE ?7 IS NULL OR NOT EXISTS (SELECT 1 FROM events WHERE ref = ?7 AND step = ?1)`,
      ).bind(e.step, e.at, e.trade, e.theme, e.src, e.campaign, e.ref).run()
    },
    async addPick(p) {
      await db.prepare('INSERT INTO layout_picks (at, section, layout, theme, trade, src, ref) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
        .bind(p.at, p.section, p.layout, p.theme, p.trade, p.src, p.ref).run()
    },
    async stepCounts(q) {
      const f = filter(q, 'at')
      const rows = await all<{ step: Step; n: number }>(`SELECT step, COUNT(*) AS n FROM events WHERE ${f.sql} GROUP BY step`, f.values)
      return Object.fromEntries(rows.map(r => [r.step, r.n]))
    },
    async breakdown(q, by) {
      const col = DIMENSION_COLUMN[by]
      const f = filter(q, 'at')
      return all(`SELECT ${col} AS key, step, COUNT(*) AS n FROM events WHERE ${f.sql} GROUP BY ${col}, step`, f.values)
    },
    async daily(q, steps, offsetMinutes) {
      const f = filter(q, 'at')
      const marks = steps.map(() => '?').join(', ')
      return all(
        `SELECT CAST((at + ?) / ${DAY_MS} AS INTEGER) AS day, step, COUNT(*) AS n FROM events
         WHERE ${f.sql} AND step IN (${marks}) GROUP BY day, step ORDER BY day`,
        [offsetMinutes * 60_000, ...f.values, ...steps],
      )
    },
    async picks(q) {
      const f = filter(q, 'at')
      return all(`SELECT section, layout, COUNT(*) AS n FROM layout_picks WHERE ${f.sql} GROUP BY section, layout`, f.values)
    },
    async money(q): Promise<MoneyTotals> {
      const paid = filter(q, 'paid_at')
      const refunded = filter(q, 'refunded_at')
      const disputed = filter(q, 'at')
      const lost = filter(q, 'dispute_lost_at')
      const [sales, refunds, disputes, lostTo] = await Promise.all([
        one<{ sales: number; revenue: number; partial: number; fees: number; unknown: number }>(
          `SELECT COUNT(*) AS sales, COALESCE(SUM(amount), 0) AS revenue,
           COALESCE(SUM(CASE WHEN refunded_at IS NULL THEN refunded_amount END), 0) AS partial,
           COALESCE(SUM(stripe_fee), 0) AS fees, SUM(CASE WHEN stripe_fee IS NULL THEN 1 ELSE 0 END) AS unknown
           FROM drafts WHERE ${paid.sql}`, paid.values),
        one<{ n: number; amount: number }>(`SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS amount FROM drafts WHERE ${refunded.sql}`, refunded.values),
        one<{ n: number }>(`SELECT COUNT(*) AS n FROM events WHERE step = 'disputed' AND ${disputed.sql}`, disputed.values),
        // What a lost dispute took, less any partial refund already given back (counted above).
        one<{ amount: number }>(`SELECT COALESCE(SUM(amount - COALESCE(refunded_amount, 0)), 0) AS amount FROM drafts WHERE refunded_at IS NULL AND ${lost.sql}`, lost.values),
      ])
      return {
        sales: sales.sales, revenue: sales.revenue, partialRefunded: sales.partial,
        refunds: refunds.n, refundedAmount: refunds.amount, disputes: disputes.n, lostToDisputes: lostTo.amount,
        stripeFees: sales.fees, feesUnknown: sales.unknown ?? 0,
      }
    },
    async recentSites(q, limit) {
      const f = filter(q, 'created_at')
      const rows = await all<SiteDbRow>(
        `SELECT ref, slug, created_at, paid_at, published_at, refunded_at, disputed_at, dispute_lost_at, src, campaign,
           json_extract(record, '$.tradeId') AS trade, json_extract(record, '$.style.theme') AS theme
         FROM drafts WHERE ${f.sql} ORDER BY created_at DESC LIMIT ?`,
        [...f.values, limit],
      )
      return rows.map(toSite)
    },
    async sources(q) {
      // The busiest in the range first, so a burst of junk tags can't push real ones off the list.
      const rows = await all<{ src: string }>(
        `SELECT src FROM events WHERE src IS NOT NULL AND at >= ? AND at <= ? GROUP BY src ORDER BY COUNT(*) DESC, src LIMIT ${MAX_SOURCES}`, [q.from, q.to])
      return rows.map(r => r.src)
    },
    async forgetBefore(before) {
      await db.batch([
        db.prepare('DELETE FROM events WHERE at < ?1').bind(before),
        db.prepare('DELETE FROM layout_picks WHERE at < ?1').bind(before),
      ])
    },
  }
}
