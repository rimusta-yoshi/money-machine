import { parseSite } from '../../src/site/parse'
import { SiteParseError } from '../../src/site/schema'
import type { Site } from '../../src/site/schema'
import { sitePhotos } from '../../src/publish/photos'
import { siteOrigin } from './config'
import { HttpError, json, readBody, readJson } from './http'
import { rateLimit, SIZE } from './limits'
import { draftPhotoKey, draftPhotoPrefix, draftPhotoUrl, ownPhotoName, photoName } from './photos'
import type { Deps, DraftRow } from './ports'
import { DRAFT_KEY, newDraftKey, newRef, sha256Hex } from './tokens'

/** The draft whose key is in the Authorization header. */
export async function authDraft(req: Request, deps: Deps): Promise<DraftRow> {
  const key = /^Bearer (\S+)$/.exec(req.headers.get('Authorization') ?? '')?.[1] ?? ''
  const draft = DRAFT_KEY.test(key) ? await deps.db.draftByKey(await sha256Hex(key)) : null
  if (!draft) throw new HttpError(401, 'unknown_draft', 'We could not find that saved site. It may have been started on another device.')
  return draft
}

/**
 * Validates a record exactly as the builder would load it (parseSite, never trusting the
 * client), then holds it to what the server stores: photos must already be uploads of this
 * draft, never data URLs or links elsewhere.
 */
export function validRecord(input: unknown, deps: Deps, ref: string): Site {
  let site: Site
  try {
    site = parseSite(input)
  } catch (err) {
    if (err instanceof SiteParseError) {
      throw new HttpError(422, 'invalid_site', 'Some of the site details could not be saved.', { issues: err.issues.slice(0, 20).map(i => ({ path: i.path.join('.'), message: i.message })) })
    }
    throw err
  }
  for (const photo of sitePhotos(site)) {
    if (!ownPhotoName(photo.url, deps.config, ref)) {
      throw new HttpError(422, 'photo_not_uploaded', 'A photo has not finished uploading. Please try saving again.')
    }
  }
  return site
}

/** The draft's saved record, parsed again on the way out (records are always re-validated). */
export function storedRecord(draft: DraftRow): Site | null {
  return draft.record ? parseSite(JSON.parse(draft.record)) : null
}

export async function createDraft(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'create')
  const key = newDraftKey()
  await deps.db.createDraft({ ref: newRef(), keyHash: await sha256Hex(key), now: deps.now() })
  return json({ key }, 201)
}

export async function getDraft(req: Request, deps: Deps): Promise<Response> {
  const draft = await authDraft(req, deps)
  return json({
    record: storedRecord(draft),
    slug: draft.slug,
    publishedUrl: draft.slug ? `${siteOrigin(deps.config, draft.slug)}/` : null,
    updatedAt: draft.updatedAt,
  })
}

export async function saveDraft(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'save')
  const draft = await authDraft(req, deps)
  const site = validRecord(await readJson(req, SIZE.record), deps, draft.ref)
  const now = deps.now()
  await deps.db.saveRecord(draft.ref, JSON.stringify(site), now)
  return json({ updatedAt: now })
}

export async function uploadPhoto(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'photo')
  const draft = await authDraft(req, deps)
  const bytes = await readBody(req, SIZE.photo)
  const { name, type } = await photoName(bytes)
  const existing = await deps.blobs.list(draftPhotoPrefix(draft.ref))
  if (!existing.includes(draftPhotoKey(draft.ref, name))) {
    if (existing.length >= SIZE.photosPerDraft) throw new HttpError(409, 'too_many_photos', 'This site has reached its photo upload limit. Please get in touch and we will sort it out.')
    await deps.blobs.put(draftPhotoKey(draft.ref, name), bytes, type.contentType)
  }
  return json({ url: draftPhotoUrl(deps.config, draft.ref, name) }, 201)
}
