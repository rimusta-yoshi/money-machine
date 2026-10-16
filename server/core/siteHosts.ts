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
  /** Taken down by an admin: every page says the site isn't available. */
  down: boolean
}

const MAX_ENTRIES = 2000
const cache = new Map<string, { value: unknown; until: number }>()

/** A failed load throws and isn't remembered, so the next request tries again. */
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
 * Never takes a site down: if the database fails (or the table isn't there yet, before
 * migration 0007), the answer is "no own domain" and the free address serves as ever.
 */
const orNull = <T>(what: string, p: Promise<T | null>): Promise<T | null> => p.catch(err => {
  console.error(`Own-domain lookup for ${what} failed; serving without it`, err)
  return null
})

/**
 * The site an own domain shows, or null. Only once we've seen the domain's ownership TXT record
 * (pointing a CNAME at us isn't enough to claim it), while Cloudflare finishes (pending) and
 * once it's live. Never for a site that's refunded, disputed or not live. A taken-down site's
 * domain (until its pause reaches Cloudflare) is answered with `down`, to say so.
 */
export const siteForHost = (deps: Deps, host: string): Promise<HostSite | null> =>
  orNull(host, remembered(deps, `host:${host}`, async () => {
    const d = await deps.domains.byHost(host)
    if (!d?.slug || !(d.siteLive || d.takenDown) || !d.verifiedAt || (d.status !== 'pending' && d.status !== 'active')) return null
    return { slug: d.slug, hostname: d.hostname, down: d.takenDown }
  }))

/**
 * Whether the site at a free address is taken down by an admin. If the database can't be read,
 * the answer is "no" and the site serves as ever (like the own-domain lookups): a take-down shows
 * within HOST_CACHE_SECONDS.
 */
export const slugTakenDown = async (deps: Deps, slug: string): Promise<boolean> =>
  (await orNull(slug, remembered(deps, `down:${slug}`, () => deps.db.slugTakenDown(slug)))) === true

/** The own domain a free address sends its visitors to, once it's live. */
export const ownHostForSlug = (deps: Deps, slug: string): Promise<string | null> =>
  orNull(slug, remembered(deps, `slug:${slug}`, () => deps.domains.activeHostForSlug(slug)))

/** Tests only: forget everything remembered. */
export const forgetHosts = (): void => cache.clear()
