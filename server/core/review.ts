import { z } from 'zod'
import type { Site } from '../../src/site/schema'
import { requireAdminKey } from './admin'
import { siteOrigin } from './config'
import { HttpError, json, readJson } from './http'
import { rateLimit, SIZE } from './limits'
import { storedRecord } from './drafts'
import type { Deps, DraftRow } from './ports'
import { REVIEW_IGNORE, REVIEW_WORDS, reviewText, reviewWords } from './reviewWords'
import { REF, sha256Hex } from './tokens'

/**
 * The review flag: a site whose text has words like "bank" or "password" in it goes on the
 * dashboard's "Sites to review" list when it's checked out or published. It never blocks
 * anything and the customer never hears of it.
 */

export const REVIEW_SHOWN = 100

/**
 * What was checked: the site's text and the word lists. Unchanged, a site marked reviewed stays
 * so; a changed list looks again at text already checked.
 */
export const reviewFingerprint = (site: Site, words: readonly string[] = REVIEW_WORDS, ignore: readonly string[] = REVIEW_IGNORE): Promise<string> =>
  sha256Hex(JSON.stringify([words, ignore, reviewText(site)]))

/** Records a flag if the site's text has any listed word. Never throws: checkout and publishing go on regardless. */
export async function flagForReview(deps: Deps, ref: string, site: Site): Promise<void> {
  try {
    const words = reviewWords(site)
    if (!words.length) return
    const fingerprint = await reviewFingerprint(site)
    await deps.db.flagReview(ref, { words, fingerprint, now: deps.now() })
  } catch (err) {
    console.error(`Recording a review flag for ${ref} failed`, err)
  }
}

/** The same for a draft's saved record (a preview link), if it has one. Never throws. */
export async function flagSavedForReview(deps: Deps, draft: DraftRow): Promise<void> {
  try {
    const site = storedRecord(draft)
    if (site) await flagForReview(deps, draft.ref, site)
  } catch (err) {
    console.error(`Checking ${draft.ref} for review failed`, err)
  }
}

/** GET /v1/admin/review (admin key): flagged sites not yet marked reviewed, newest first. */
export async function sitesToReview(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'admin')
  await requireAdminKey(req, deps)
  const rows = await deps.db.sitesToReview(REVIEW_SHOWN)
  return json({
    sites: rows.map(r => ({
      ref: r.ref, slug: r.slug, name: r.name, words: r.words, flaggedAt: r.flaggedAt, paid: r.paid, refunded: r.refunded,
      published: r.published, takenDown: r.takenDown, url: r.live && r.slug ? `${siteOrigin(deps.config, r.slug)}/` : null,
    })),
  })
}

const clearBody = z.object({ ref: z.string().regex(REF) })

/** POST /v1/admin/review/clear {ref} (admin key): "Mark reviewed". */
export async function clearReview(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'admin')
  await requireAdminKey(req, deps)
  const parsed = clearBody.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid_ref', 'That site reference isn’t right.')
  if (!(await deps.db.clearReview(parsed.data.ref, deps.now()))) throw new HttpError(404, 'not_flagged', 'That site isn’t on the review list.')
  return json({ ok: true })
}
