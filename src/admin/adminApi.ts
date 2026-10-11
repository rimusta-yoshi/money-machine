import { unreachable } from '../api/client'
import type { Range } from './range'
import type { Stats } from './types'

/** The dashboard's one call. Throws an AdminError whose message can be shown as is. */

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

export async function fetchStats(base: string, key: string, q: StatsQuery, fetcher: typeof fetch = (...a) => fetch(...a)): Promise<Stats> {
  const params = new URLSearchParams({ from: String(q.from), to: String(q.to), tz: String(q.tz), ...(q.src ? { src: q.src } : {}) })
  let res: Response
  try {
    res = await fetcher(`${base}/v1/admin/stats?${params}`, { headers: { 'X-Admin-Key': key }, cache: 'no-store' })
  } catch {
    throw new AdminError(0, unreachable(base))
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new AdminError(res.status, typeof body.message === 'string' ? body.message : 'The numbers could not be loaded. Try again.')
  return body as unknown as Stats
}
