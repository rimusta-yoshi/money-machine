import { z } from 'zod'
import { requireAdminKey } from './admin'
import { siteOrigin } from './config'
import { dropDomain } from './domainLifecycle'
import { HttpError, json, readJson } from './http'
import { rateLimit, SIZE } from './limits'
import type { Deps } from './ports'
import { goneKey, sitePrefix } from './storage'

/**
 * Clearing out test sites before launch (admin key only; scripts/test-sites.mjs calls these).
 * Refused once LAUNCHED is true, so it can never touch a real customer's site.
 *
 * GET  /v1/admin/sites           every published or paid site
 * POST /v1/admin/sites/delete    {refs: [...]} or {all: true}: deletes them for good
 */

function beforeLaunch(deps: Deps): void {
  if (deps.config.launched) throw new HttpError(403, 'launched', 'Deleting sites is only for test sites before launch (LAUNCHED is true).')
}

export async function listSites(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'admin')
  await requireAdminKey(req, deps)
  const sites = await deps.db.sites()
  return json({
    launched: deps.config.launched,
    sites: sites.map(d => ({
      ref: d.ref,
      url: d.slug ? `${siteOrigin(deps.config, d.slug)}/` : null,
      email: d.payment?.email ?? null,
      paid: !!d.payment,
      refunded: !!d.refundedAt,
      disputed: !!d.disputedAt,
      createdAt: new Date(d.createdAt).toISOString(),
    })),
  }, 200, { 'Cache-Control': 'no-store' })
}

const deleteBody = z.union([
  z.object({ refs: z.array(z.string().regex(/^[0-9a-f]{32}$/)).min(1).max(500) }).strict(),
  z.object({ all: z.literal(true) }).strict(),
])

export async function deleteSites(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'admin')
  await requireAdminKey(req, deps)
  beforeLaunch(deps)
  const parsed = deleteBody.safeParse(await readJson(req, SIZE.smallJson * 8))
  if (!parsed.success) throw new HttpError(422, 'invalid', 'Send {"refs": [...]} or {"all": true}.')
  const known = new Set((await deps.db.sites()).map(d => d.ref))
  const refs = 'all' in parsed.data ? [...known] : parsed.data.refs.filter(r => known.has(r))
  const deleted: { ref: string; addresses: string[] }[] = []
  for (const ref of refs) {
    // Off Cloudflare first, while the row still says which hostname it was.
    await dropDomain(deps, ref, { republish: false })
    const slugs = await deps.db.deleteDraft(ref)
    // Its files: the live site, any "no longer available" marker and its uploaded photos.
    for (const slug of slugs) await deps.blobs.delete([...(await deps.blobs.list(sitePrefix(slug))), goneKey(slug)])
    await deps.blobs.delete(await deps.blobs.list(`drafts/${ref}/`))
    deleted.push({ ref, addresses: slugs })
  }
  return json({ deleted }, 200, { 'Cache-Control': 'no-store' })
}
