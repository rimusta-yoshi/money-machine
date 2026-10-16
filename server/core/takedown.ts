import { z } from 'zod'
import { checkSlug } from '../../src/publish/slug'
import { requireAdminKey } from './admin'
import { siteOrigin, slugFromHost } from './config'
import { pauseDomain, resumeDomain } from './domainLifecycle'
import { HttpError, json, readJson } from './http'
import { rateLimit, SIZE } from './limits'
import type { Deps, DraftRow } from './ports'
import { REF } from './tokens'

/**
 * Admin take-down and restore (abuse: phishing, scams, illegal content), with the admin key.
 * A take-down pulls a site at once without refunding it; a restore puts it back exactly.
 * Nothing is deleted: the record, photos and published files all stay. While it's down:
 *
 * - every page of its free address and own domain says "This site isn't available" (site.ts);
 * - its own domain is paused through the lifecycle, the same way a dispute pauses it;
 * - its edit link opens a "taken down" screen, and saving, publishing, previews, downloading and
 *   the self-serve refund link are refused (drafts.ts, account.ts).
 *
 * A restore only undoes the take-down: a site refunded, or with a dispute open or lost, stays down.
 * No email is sent either way; replies are written by hand (docs/pm/abuse-routine.md).
 *
 * GET  /v1/admin/sites/lookup?address=… | ?ref=…  the site and its take-down record
 * POST /v1/admin/sites/takedown {ref | address, reason, by?}
 * POST /v1/admin/sites/restore  {ref | address, by?}
 */

/** The host typed or pasted: scheme, path, port and a trailing dot dropped. */
export function addressHost(input: string): string {
  return input.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '').split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.$/, '')
}

/** The site at an address: the free <slug>.<base> one (or just the slug), or the customer's own domain. */
async function siteAtAddress(deps: Deps, input: string): Promise<DraftRow | null> {
  const host = addressHost(input)
  const slug = host.includes('.') ? slugFromHost(host, { baseDomain: deps.config.baseDomain.replace(/:\d+$/, '') }) : host
  if (slug) return checkSlug(slug).ok ? deps.db.draftBySlug(slug) : null
  // The bare domain is often typed for a site connected as www.<domain>.
  const own = await deps.domains.byHost(host) ?? await deps.domains.byHost(`www.${host}`)
  return own ? deps.db.draftByRef(own.ref) : null
}

const by = z.string().trim().min(1).max(80).regex(/^[^\p{Cc}]+$/u).optional()
const target = { ref: z.string().regex(REF).optional(), address: z.string().trim().min(1).max(300).optional() }
const exactlyOne = (b: { ref?: string; address?: string }) => !!b.ref !== !!b.address
const ONE = 'Send either a site reference (ref) or its address, not both.'

const takedownBody = z.object({
  ...target,
  reason: z.string().trim().min(3).max(500).regex(/^[^\p{Cc}]+$/u),
  by,
}).strict().refine(exactlyOne, ONE)
const restoreBody = z.object({ ...target, by }).strict().refine(exactlyOne, ONE)
const lookupQuery = z.object(target).strict().refine(exactlyOne, ONE)

async function findSite(deps: Deps, t: { ref?: string; address?: string }): Promise<DraftRow> {
  const draft = t.ref ? await deps.db.draftByRef(t.ref) : await siteAtAddress(deps, t.address ?? '')
  if (!draft) throw new HttpError(404, 'not_found', t.ref ? 'No site has that reference.' : 'No site is at that address.')
  return draft
}

/** Everything the dashboard and script show about one site. */
async function summary(deps: Deps, draft: DraftRow) {
  const [own, record] = await Promise.all([deps.domains.byRef(draft.ref), deps.db.takedownRecord(draft.ref)])
  let name: string | null = null
  try {
    const v: unknown = draft.record ? JSON.parse(draft.record) : null
    const n = (v as { business?: { name?: unknown } } | null)?.business?.name
    name = typeof n === 'string' && n ? n : null
  } catch {
    // Unreadable record: no name to show.
  }
  return {
    ref: draft.ref,
    name,
    url: draft.slug ? `${siteOrigin(deps.config, draft.slug)}/` : null,
    ownDomain: own ? { hostname: own.hostname, status: own.status } : null,
    email: draft.payment?.email ?? null,
    paid: !!draft.payment,
    published: !!draft.publishedAt,
    refunded: !!draft.refundedAt,
    disputed: !!draft.disputedAt && !draft.disputeLostAt,
    disputeLost: !!draft.disputeLostAt,
    takenDown: !!draft.takenDownAt,
    takedown: record,
  }
}

async function admin(req: Request, deps: Deps): Promise<void> {
  await rateLimit(deps, req, 'admin')
  await requireAdminKey(req, deps)
}

async function body<T>(req: Request, shape: z.ZodType<T>): Promise<T> {
  const parsed = shape.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid', parsed.error.issues[0]?.message ?? 'That request isn’t right.', { issues: parsed.error.issues.slice(0, 5).map(i => ({ path: i.path.join('.'), message: i.message })) })
  return parsed.data
}

/** GET /v1/admin/sites/lookup?address=…|ref=…: "find a site by address". */
export async function lookupSite(req: Request, deps: Deps): Promise<Response> {
  await admin(req, deps)
  const parsed = lookupQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) throw new HttpError(422, 'invalid', 'Type a site’s address, like name.localblocks.co.uk or their own domain.')
  return json({ site: await summary(deps, await findSite(deps, parsed.data)) }, 200, { 'Cache-Control': 'no-store' })
}

/** POST /v1/admin/sites/takedown: down at once, nothing deleted, no refund, no email. */
export async function takedownSite(req: Request, deps: Deps): Promise<Response> {
  await admin(req, deps)
  const b = await body(req, takedownBody)
  const draft = await findSite(deps, b)
  if (!(await deps.db.markTakenDown(draft.ref, { now: deps.now(), reason: b.reason, by: b.by ?? 'admin' }))) {
    throw new HttpError(409, 'already_taken_down', 'That site is already taken down.')
  }
  // Off Cloudflare, kept to put back. If Cloudflare can't be reached the cron pauses it later;
  // meanwhile the site worker shows the "isn't available" page on it.
  const domainPaused = await pauseDomain(deps, draft.ref)
  console.warn(`Site ${draft.ref} taken down by ${b.by ?? 'admin'}`)
  return json({ site: await summary(deps, (await deps.db.draftByRef(draft.ref))!), domainPaused }, 200, { 'Cache-Control': 'no-store' })
}

/** POST /v1/admin/sites/restore: undoes the take-down only. */
export async function restoreSite(req: Request, deps: Deps): Promise<Response> {
  await admin(req, deps)
  const b = await body(req, restoreBody)
  const draft = await findSite(deps, b)
  if (!(await deps.db.markRestored(draft.ref, { now: deps.now(), by: b.by ?? 'admin' }))) {
    throw new HttpError(409, 'not_taken_down', 'That site isn’t taken down.')
  }
  // Refunded, or a dispute open or lost: that keeps it down (and its domain off), whatever the take-down did.
  // Read again after the restore, so a dispute opened meanwhile counts.
  const after = (await deps.db.draftByRef(draft.ref))!
  const stillDown = !!(after.refundedAt || after.disputedAt || after.disputeLostAt)
  // Back on Cloudflare, waiting to be live again, as after a won dispute. If Cloudflare can't be
  // reached the cron puts it back later.
  const domainResumed = stillDown ? false : await resumeDomain(deps, draft.ref)
  console.warn(`Site ${draft.ref} restored by ${b.by ?? 'admin'}`)
  return json({ site: await summary(deps, after), domainResumed, stillDown }, 200, { 'Cache-Control': 'no-store' })
}
