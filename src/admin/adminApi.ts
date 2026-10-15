import { unreachable } from '../api/client'
import type { Range } from './range'
import type { ReviewSite, Stats } from './types'

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

/** "Mark reviewed": takes a site off the list until its text changes. */
export async function clearReview(base: string, key: string, ref: string, fetcher: Fetcher = defaultFetch): Promise<void> {
  await adminCall(base, key, '/v1/admin/review/clear', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref }),
  }, 'That site could not be marked reviewed. Try again.', fetcher)
}
