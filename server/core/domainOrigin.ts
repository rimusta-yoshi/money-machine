import { siteOrigin } from './config'
import type { Deps } from './ports'

/**
 * The address a site's pages name as their own (canonical link, sitemap, Open Graph): the
 * customer's own domain once it's live, else the free <slug>.<base> address.
 */
export async function liveOrigin(deps: Deps, ref: string, slug: string): Promise<string> {
  try {
    const own = await deps.domains.byRef(ref)
    if (own?.status === 'active') return `https://${own.hostname}`
  } catch (err) {
    // Never in the way of publishing: the free address is always right.
    console.warn(`Could not read ${ref}'s own domain`, err)
  }
  return siteOrigin(deps.config, slug)
}
