import { z } from 'zod'
import { siteFiles } from '../../src/publish/files'
import { mapPhotoUrls, sitePhotos } from '../../src/publish/photos'
import { checkSlug, slugCandidates } from '../../src/publish/slug'
import { isReadyToPublish } from '../../src/site/checklist'
import { unsavedSections } from '../../src/site/page'
import type { Site } from '../../src/site/schema'
import { tradeById } from '../../src/trades'
import type { TradeConfig } from '../../src/types'
import { siteOrigin } from './config'
import { authDraft, storedRecord } from './drafts'
import { HttpError, json, readJson } from './http'
import { rateLimit, SIZE } from './limits'
import { draftPhotoKey, ownPhotoName } from './photos'
import { sitePrefix } from './storage'
import type { Deps, DraftRow } from './ports'
import { sameSecret } from './tokens'

/** Publishing is behind an admin key until payment exists (Phase 2). */
async function requireAdmin(req: Request, deps: Deps): Promise<void> {
  const token = deps.config.adminToken
  if (!token) throw new HttpError(403, 'publishing_closed', 'Publishing is not open yet.')
  const given = req.headers.get('X-Admin-Key') ?? ''
  if (!given || !(await sameSecret(given, token))) throw new HttpError(403, 'not_allowed', 'That admin key is not right.')
}

function validSlug(input: string): string {
  const check = checkSlug(input)
  if (!check.ok) throw new HttpError(422, 'invalid_slug', check.message, { problem: check.problem })
  return check.slug
}

/** The first free address for this business, for when the one asked for is taken. */
async function suggestion(deps: Deps, draft: DraftRow, site: Site | null): Promise<string | null> {
  if (!site) return null
  const trade = tradeById[site.tradeId]
  for (const slug of slugCandidates(site.business.name, { location: site.business.location, trade: trade.name })) {
    const owner = await deps.db.slugOwner(slug)
    if (!owner || owner === draft.ref) return slug
  }
  return null
}

/** GET /v1/slugs/<slug>: is this address free for this draft? (Its own address counts as free.) */
export async function slugStatus(req: Request, deps: Deps, input: string): Promise<Response> {
  await rateLimit(deps, req, 'slug')
  const draft = await authDraft(req, deps)
  const check = checkSlug(input)
  if (!check.ok) return json({ slug: input, available: false, message: check.message })
  const owner = await deps.db.slugOwner(check.slug)
  if (!owner || owner === draft.ref) return json({ slug: check.slug, available: true, url: `${siteOrigin(deps.config, check.slug)}/` })
  return json({ slug: check.slug, available: false, message: 'That address is taken.', suggestion: await suggestion(deps, draft, storedRecord(draft)) })
}

const publishBody = z.object({ slug: z.string().max(64) })

const toBytes = async (body: ReadableStream | ArrayBuffer): Promise<ArrayBuffer> =>
  body instanceof ArrayBuffer ? body : new Response(body).arrayBuffer()

/**
 * POST /v1/draft/publish: renders the saved record (the shared generator, no measuring) into
 * static files and stores them under the address, with the photos the site uses. A changed
 * address moves the site and frees the old one.
 */
export async function publish(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'publish')
  const draft = await authDraft(req, deps)
  await requireAdmin(req, deps)
  const parsed = publishBody.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid_slug', 'Choose an address for your site.')
  const slug = validSlug(parsed.data.slug)
  const site = storedRecord(draft)
  if (!site) throw new HttpError(409, 'not_saved', 'Save your site before publishing it.')
  const trade = tradeById[site.tradeId]
  if (!isReadyToPublish(site)) throw new HttpError(409, 'not_ready', 'Add your business name, phone number and email before publishing.')
  if (unsavedSections(site, trade).length) throw new HttpError(409, 'not_checked', 'Some sections have not been checked yet. Press Publish in the builder to check them first.')

  // Everything that can fail on the customer's side is checked before the address is claimed.
  const photos: { name: string; bytes: ArrayBuffer; contentType: string }[] = []
  for (const photo of sitePhotos(site)) {
    const name = ownPhotoName(photo.url, deps.config, draft.ref)
    const obj = name ? await deps.blobs.get(draftPhotoKey(draft.ref, name)) : null
    if (!name || !obj) throw new HttpError(409, 'photo_missing', 'One of your photos could not be found. Please add it again and save.')
    photos.push({ name, bytes: await toBytes(obj.body), contentType: obj.contentType })
  }

  const now = deps.now()
  if (!(await deps.db.claimSlug(slug, draft.ref, now))) {
    throw new HttpError(409, 'slug_taken', 'That address is taken.', { suggestion: await suggestion(deps, draft, site) })
  }
  const origin = siteOrigin(deps.config, slug)
  try {
    await writeSite(deps, slug, photos, await mapPhotoUrls(site, url => `/photos/${ownPhotoName(url, deps.config, draft.ref)}`), trade, origin, now)
  } catch (err) {
    // A new address that never went up is freed again.
    if (draft.slug !== slug) await deps.db.releaseSlug(slug, draft.ref)
    throw err
  }
  if (draft.slug && draft.slug !== slug) await deps.blobs.delete(await deps.blobs.list(sitePrefix(draft.slug)))
  // Also frees any other address this draft still holds (the old one, or a half-finished attempt).
  await deps.db.markPublished(draft.ref, slug, now)
  return json({ slug, url: `${origin}/` })
}

/** Stores a site's photos and files under its address, then removes files it no longer has. */
async function writeSite(deps: Deps, slug: string, photos: { name: string; bytes: ArrayBuffer; contentType: string }[], site: Site, trade: TradeConfig, origin: string, now: number): Promise<void> {
  const prefix = sitePrefix(slug)
  for (const p of photos) await deps.blobs.put(`${prefix}photos/${p.name}`, p.bytes, p.contentType)
  const files = await siteFiles(site, trade, { origin, noindex: deps.config.noindex, date: new Date(now) })
  // Pages last, so nothing they link to is missing while they go up.
  for (const f of [...files].sort((a, b) => Number(a.name.endsWith('.html')) - Number(b.name.endsWith('.html')))) {
    await deps.blobs.put(prefix + f.name, f.body, f.contentType)
  }
  const keep = new Set([...files.map(f => prefix + f.name), ...photos.map(p => `${prefix}photos/${p.name}`)])
  await deps.blobs.delete((await deps.blobs.list(prefix)).filter(k => !keep.has(k)))
}
