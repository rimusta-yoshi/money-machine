import { z } from 'zod'
import { requireAdminKey } from './admin'
import { siteOrigin } from './config'
import { dropDomain, FREE_HOSTNAMES } from './domainLifecycle'
import { HttpError, json, readJson } from './http'
import { rateLimit, SIZE } from './limits'
import type { Deps } from './ports'

/**
 * Own domains on the admin dashboard: how many there are (Cloudflare for SaaS is free up to
 * 100 custom hostnames), the newest ones, and disconnecting one (admin key only).
 */

const SHOWN = 50

export async function domainStats(deps: Deps) {
  const [counts, list] = await Promise.all([deps.domains.counts(), deps.domains.list(SHOWN)])
  // What Cloudflare counts: every hostname still on it (paused ones are off it).
  const onCloudflare = counts.pending + counts.active + counts.removing
  return {
    counts, freeLimit: FREE_HOSTNAMES, onCloudflare,
    recent: list.map(d => ({
      hostname: d.hostname, apex: d.apex, status: d.status, provider: d.provider, oneClick: !!d.dc,
      createdAt: d.createdAt, activeAt: d.activeAt, siteUrl: d.slug ? `${siteOrigin(deps.config, d.slug)}/` : null,
    })),
  }
}

const body = z.object({ hostname: z.string().trim().toLowerCase().max(253) }).strict()

/** POST /v1/admin/domains/disconnect {hostname}: takes a customer's domain off (support, abuse). */
export async function adminDisconnectDomain(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'admin')
  await requireAdminKey(req, deps)
  const parsed = body.safeParse(await readJson(req, SIZE.smallJson))
  if (!parsed.success) throw new HttpError(422, 'invalid', 'Send {"hostname": "www.example.co.uk"}.')
  const found = await deps.domains.byHost(parsed.data.hostname)
  if (!found) throw new HttpError(404, 'not_found', 'No site has that domain.')
  await dropDomain(deps, found.ref, { republish: true })
  return json({ disconnected: found.hostname, siteUrl: found.slug ? `${siteOrigin(deps.config, found.slug)}/` : null })
}
