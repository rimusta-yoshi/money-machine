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
import { goneKey, sitePrefix } from './storage'
import type { Deps, DraftRow } from './ports'
import { sameSecret } from './tokens'

/** Publishing without paying: the admin key, for testing and support only. */
async function requireAdmin(req: Request, deps: Deps): Promise<void> {
  const token = deps.config.adminToken
  if (!token) throw new HttpError(403, 'publishing_closed', 'Publishing is not open yet.')
  const given = req.headers.get('X-Admin-Key') ?? ''
  if (!given || !(await sameSecret(given, token))) throw new HttpError(403, 'not_allowed', 'That admin key is not right.')
}

export function validSlug(input: string): string {
  const check = checkSlug(input)
  if (!check.ok) throw new HttpError(422, 'invalid_slug', check.message, { problem: check.problem })
  return check.slug
}

/** The first free address for this business, for when the one asked for is taken. */
export async function suggestion(deps: Deps, ref: string, site: Site | null): Promise<string | null> {
  if (!site) return null
  const trade = tradeById[site.tradeId]
  const now = deps.now()
  for (const slug of slugCandidates(site.business.name, { location: site.business.location, trade: trade.name })) {
    const owner = await deps.db.slugOwner(slug, now)
    if (!owner || owner === ref) return slug
  }
  return null
}

/** GET /v1/slugs/<slug>: is this address free for this draft? (Its own address counts as free.) */
export async function slugStatus(req: Request, deps: Deps, input: string): Promise<Response> {
  await rateLimit(deps, req, 'slug')
  const draft = await authDraft(req, deps)
  const check = checkSlug(input)
  if (!check.ok) return json({ slug: input, available: false, message: check.message })
  const owner = await deps.db.slugOwner(check.slug, deps.now())
  if (!owner || owner === draft.ref) return json({ slug: check.slug, available: true, url: `${siteOrigin(deps.config, check.slug)}/` })
  return json({ slug: check.slug, available: false, message: 'That address is taken.', suggestion: await suggestion(deps, draft.ref, storedRecord(draft)) })
}

type Photo = { name: string; bytes: ArrayBuffer; contentType: string }

const toBytes = async (body: ReadableStream | ArrayBuffer): Promise<ArrayBuffer> =>
  body instanceof ArrayBuffer ? body : new Response(body).arrayBuffer()

/** Everything that can fail on the customer's side, checked before an address is claimed or a card is charged. */
export function checkReady(site: Site | null): Site {
  if (!site) throw new HttpError(409, 'not_saved', 'Save your site before publishing it.')
  if (!isReadyToPublish(site)) throw new HttpError(409, 'not_ready', 'Add your business name, phone number and email before publishing.')
  if (unsavedSections(site, tradeById[site.tradeId]).length) throw new HttpError(409, 'not_checked', 'Some sections have not been checked yet. Press Publish in the builder to check them first.')
  return site
}

/** The draft's own uploads that the site uses, read from storage. */
export async function sitePhotoFiles(deps: Deps, ref: string, site: Site): Promise<Photo[]> {
  const photos: Photo[] = []
  for (const photo of sitePhotos(site)) {
    const name = ownPhotoName(photo.url, deps.config, ref)
    const obj = name ? await deps.blobs.get(draftPhotoKey(ref, name)) : null
    if (!name || !obj) throw new HttpError(409, 'photo_missing', 'One of your photos could not be found. Please add it again and save.')
    photos.push({ name, bytes: await toBytes(obj.body), contentType: obj.contentType })
  }
  return photos
}

/**
 * Renders a checked record (the shared generator, no measuring) into static files under the
 * address, with the photos it uses. A changed address moves the site and frees the old one.
 * Throws slug_taken if another site holds the address.
 */
export async function putLive(deps: Deps, draft: DraftRow, slug: string, site: Site, o: { paid: boolean }): Promise<string> {
  const photos = await sitePhotoFiles(deps, draft.ref, site)
  const now = deps.now()
  if (!(await deps.db.claimSlug(slug, draft.ref, now))) {
    throw new HttpError(409, 'slug_taken', 'That address is taken.', { suggestion: await suggestion(deps, draft.ref, site) })
  }
  const origin = siteOrigin(deps.config, slug)
  try {
    const live = await mapPhotoUrls(site, url => `/photos/${ownPhotoName(url, deps.config, draft.ref)}`)
    // Search engines see paid sites only, and only once the launch flag allows it.
    await writeSite(deps, slug, photos, live, tradeById[site.tradeId], origin, now, deps.config.noindex || !o.paid)
  } catch (err) {
    // A new address that never went up is freed again.
    if (draft.slug !== slug) await deps.db.releaseSlug(slug, draft.ref)
    throw err
  }
  // Also frees any other address this draft still holds (the old one, a hold, a half-finished attempt).
  if (!(await deps.db.markPublished(draft.ref, slug, now))) {
    // Refunded while the files went up: down it comes again.
    await takeDown(deps, slug)
    throw new HttpError(403, 'refunded', 'This site was refunded and taken down.')
  }
  if (draft.slug && draft.slug !== slug) await deps.blobs.delete(await deps.blobs.list(sitePrefix(draft.slug)))
  return `${origin}/`
}

/** Takes a site down: its files go, and the address says the site is no longer available. */
export async function takeDown(deps: Deps, slug: string): Promise<void> {
  await deps.blobs.put(goneKey(slug), 'refunded', 'text/plain')
  await deps.blobs.delete(await deps.blobs.list(sitePrefix(slug)))
}

const publishBody = z.object({ slug: z.string().max(64).optional() })

/**
 * POST /v1/draft/publish: puts the saved record live. A paid site re-publishes free, at the
 * address it paid for. Anything else needs the admin key (testing and support only; the
 * public builder never shows it).
 */
export async function publish(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'publish')
  const draft = await authDraft(req, deps)
  if (draft.refundedAt) throw new HttpError(403, 'refunded', 'This site was refunded and taken down.')
  const parsed = publishBody.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid_slug', 'Choose an address for your site.')
  const paid = !!draft.payment && !!draft.slug
  if (!paid) await requireAdmin(req, deps)
  const asked = parsed.data.slug
  if (!paid && !asked) throw new HttpError(422, 'invalid_slug', 'Choose an address for your site.')
  // Moving a paid site to another address comes later (with redirects from the old one).
  if (paid && asked && asked !== draft.slug) {
    if (!req.headers.get('X-Admin-Key')) throw new HttpError(409, 'address_fixed', 'Your web address can’t be changed here yet. Get in touch and we’ll sort it out.')
    await requireAdmin(req, deps)
  }
  const slug = validSlug(asked ?? draft.slug!)
  const site = checkReady(storedRecord(draft))
  const url = await putLive(deps, draft, slug, site, { paid })
  return json({ slug, url })
}

/** Stores a site's photos and files under its address, then removes files it no longer has. */
async function writeSite(deps: Deps, slug: string, photos: Photo[], site: Site, trade: TradeConfig, origin: string, now: number, noindex: boolean): Promise<void> {
  const prefix = sitePrefix(slug)
  for (const p of photos) await deps.blobs.put(`${prefix}photos/${p.name}`, p.bytes, p.contentType)
  const files = await siteFiles(site, trade, { origin, noindex, date: new Date(now) })
  // Pages last, so nothing they link to is missing while they go up.
  for (const f of [...files].sort((a, b) => Number(a.name.endsWith('.html')) - Number(b.name.endsWith('.html')))) {
    await deps.blobs.put(prefix + f.name, f.body, f.contentType)
  }
  const keep = new Set([...files.map(f => prefix + f.name), ...photos.map(p => `${prefix}photos/${p.name}`)])
  await deps.blobs.delete([...(await deps.blobs.list(prefix)).filter(k => !keep.has(k)), goneKey(slug)])
}
