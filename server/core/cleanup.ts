import type { Deps } from './ports'
import { goneKey } from './storage'

/**
 * Daily cleanup (Cron Trigger). The builder keeps a site in the browser; the server copy is
 * only for previews and checkouts, so an unpaid one nobody has used for 30 days goes, with its
 * photos. Paid sites (refunded ones too) and published sites are never touched.
 */

const DAY = 24 * 60 * 60 * 1000
export const KEEP_UNPAID_DAYS = 30
/** D1 allows 100 bound values per query. */
const BATCH = 50
/** Enough for any day's churn; the rest waits for tomorrow. */
const MAX_ROUNDS = 20

/** A refunded site's address stays "no longer available" this long, then anyone can have it. */
export const FREE_REFUNDED_DAYS = 90

export interface CleanupResult { drafts: number; orphanPhotos: number; freedAddresses: number }

export async function cleanup(deps: Deps): Promise<CleanupResult> {
  const before = deps.now() - KEEP_UNPAID_DAYS * DAY
  let drafts = 0
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const refs = await deps.db.staleDrafts(before, BATCH)
    // Rows first (re-checked as they go), then their files; files left by a failure are orphans tomorrow.
    const deleted = await deps.db.deleteDrafts(refs, before)
    for (const ref of deleted) await deps.blobs.delete(await deps.blobs.list(`drafts/${ref}/`))
    drafts += deleted.length
    if (refs.length < BATCH) break
  }
  return { drafts, orphanPhotos: await orphanPhotos(deps), freedAddresses: await freeRefundedAddresses(deps) }
}

/** Addresses of sites refunded 90+ days ago: claim and "no longer available" page both go. */
async function freeRefundedAddresses(deps: Deps): Promise<number> {
  const slugs = await deps.db.releaseRefundedSlugs(deps.now() - FREE_REFUNDED_DAYS * DAY)
  await deps.blobs.delete(slugs.map(goneKey))
  return slugs.length
}

/** Photos left in storage for drafts that no longer exist (a failed run, a row removed by hand). */
async function orphanPhotos(deps: Deps): Promise<number> {
  const keys = await deps.blobs.list('drafts/')
  const byRef = new Map<string, string[]>()
  for (const key of keys) {
    const ref = /^drafts\/([0-9a-f]{32})\//.exec(key)?.[1]
    if (ref) byRef.set(ref, [...(byRef.get(ref) ?? []), key])
  }
  const refs = [...byRef.keys()]
  let removed = 0
  for (let i = 0; i < refs.length; i += BATCH) {
    const chunk = refs.slice(i, i + BATCH)
    const existing = await deps.db.existingRefs(chunk)
    const gone = chunk.filter(r => !existing.has(r)).flatMap(r => byRef.get(r) ?? [])
    await deps.blobs.delete(gone)
    removed += gone.length
  }
  return removed
}
