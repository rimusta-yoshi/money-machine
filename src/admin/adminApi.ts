import { unreachable } from '../api/client'
import type { Range } from './range'
import type { ReviewSite, SiteSummary, Stats, TakedownResult } from './types'

/** The dashboard's calls. Each throws an AdminError whose message can be shown as is. */

export class AdminError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'AdminError'
    this.status = status
  }
}

export interface StatsQuery extends Range {
  /** '' for every source, '(direct)' for none, else one source. */
  src: string
  tz: number
}

type Fetcher = typeof fetch
const defaultFetch: Fetcher = (...a) => fetch(...a)

/** One call with the admin key; `failed` is said when the server gives no message. */
async function adminCall<T>(base: string, key: string, path: string, init: RequestInit, failed: string, fetcher: Fetcher): Promise<T> {
  let res: Response
  try {
    res = await fetcher(`${base}${path}`, { ...init, headers: { ...init.headers as Record<string, string>, 'X-Admin-Key': key }, cache: 'no-store' })
  } catch {
    throw new AdminError(0, unreachable(base))
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new AdminError(res.status, typeof body.message === 'string' ? body.message : failed)
  return body as T
}

export async function fetchStats(base: string, key: string, q: StatsQuery, fetcher: Fetcher = defaultFetch): Promise<Stats> {
  const params = new URLSearchParams({ from: String(q.from), to: String(q.to), tz: String(q.tz), ...(q.src ? { src: q.src } : {}) })
  return adminCall<Stats>(base, key, `/v1/admin/stats?${params}`, {}, 'The numbers could not be loaded. Try again.', fetcher)
}

/** Sites flagged for review (server/core/review.ts), not yet marked reviewed. */
export async function fetchReview(base: string, key: string, fetcher: Fetcher = defaultFetch): Promise<ReviewSite[]> {
  const body = await adminCall<{ sites?: ReviewSite[] }>(base, key, '/v1/admin/review', {}, 'The sites to review could not be loaded. Try again.', fetcher)
  return body.sites ?? []
}

/** "Find a site by address": its free address, own domain (bare or www) or reference. */
export async function findSite(base: string, key: string, address: string, fetcher: Fetcher = defaultFetch): Promise<SiteSummary> {
  const q: Record<string, string> = /^[0-9a-f]{32}$/.test(address.trim()) ? { ref: address.trim() } : { address: address.trim() }
  const body = await adminCall<{ site: SiteSummary }>(base, key, `/v1/admin/sites/lookup?${new URLSearchParams(q)}`, {}, 'That site could not be found. Try again.', fetcher)
  return body.site
}

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/** Takes a site down (abuse): offline at once on every address, nothing deleted, no refund, no email. */
export async function takeDownSite(base: string, key: string, t: { ref: string; reason: string; by: string }, fetcher: Fetcher = defaultFetch): Promise<TakedownResult> {
  return adminCall<TakedownResult>(base, key, '/v1/admin/sites/takedown', post(t), 'That site could not be taken down. Try again.', fetcher)
}

/** Undoes a take-down (a refund or a dispute still keeps a site down). */
export async function restoreSite(base: string, key: string, t: { ref: string; by: string }, fetcher: Fetcher = defaultFetch): Promise<TakedownResult> {
  return adminCall<TakedownResult>(base, key, '/v1/admin/sites/restore', post(t), 'That site could not be restored. Try again.', fetcher)
}

/**
 * Who is using the dashboard, for the take-down record: the Cloudflare Access sign-in on this
 * page, when there is one; else just "dashboard".
 */
export async function adminName(fetcher: Fetcher = defaultFetch): Promise<string> {
  try {
    const res = await fetcher('/cdn-cgi/access/get-identity', { credentials: 'same-origin', cache: 'no-store' })
    const body = res.ok ? (await res.json()) as { email?: unknown } : null
    return typeof body?.email === 'string' && body.email ? `dashboard (${body.email.slice(0, 60)})` : 'dashboard'
  } catch {
    return 'dashboard'
  }
}

/** "Mark reviewed": takes a site off the list until its text changes. */
export async function clearReview(base: string, key: string, ref: string, fetcher: Fetcher = defaultFetch): Promise<void> {
  await adminCall(base, key, '/v1/admin/review/clear', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref }),
  }, 'That site could not be marked reviewed. Try again.', fetcher)
}
