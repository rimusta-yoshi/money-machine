import type { Deps } from './ports'

/**
 * The site worker's lookups for own domains, remembered for a minute (HOST_CACHE_SECONDS) in
 * the worker's memory, so a busy site costs one database read a minute, not one per request.
 * A domain that goes live, or is disconnected, shows within that minute.
 */

export interface HostSite {
  slug: string
  /** The address visitors should be on: a bare domain sends them here. */
  hostname: string
}

const MAX_ENTRIES = 2000
const cache = new Map<string, { value: unknown; until: number }>()

async function remembered<T>(deps: Deps, key: string, load: () => Promise<T>): Promise<T> {
  const now = deps.now()
  const hit = cache.get(key)
  if (hit && hit.until > now) return hit.value as T
  const value = await load()
  if (cache.size >= MAX_ENTRIES) cache.clear()
  cache.set(key, { value, until: now + deps.config.hostCacheSeconds * 1000 })
  return value
}

/**
 * The site an own domain shows, or null. Served while Cloudflare is checking it (pending) and
 * once it's live: only the domain's real owner can point it at us. Never for a site that's
 * refunded, disputed or not live.
 */
export const siteForHost = (deps: Deps, host: string): Promise<HostSite | null> =>
  remembered(deps, `host:${host}`, async () => {
    const d = await deps.domains.byHost(host)
    if (!d?.slug || !d.siteLive || (d.status !== 'pending' && d.status !== 'active')) return null
    return { slug: d.slug, hostname: d.hostname }
  })

/** The own domain a free address sends its visitors to, once it's live. */
export const ownHostForSlug = (deps: Deps, slug: string): Promise<string | null> =>
  remembered(deps, `slug:${slug}`, () => deps.domains.activeHostForSlug(slug))

/** Tests only: forget everything remembered. */
export const forgetHosts = (): void => cache.clear()
