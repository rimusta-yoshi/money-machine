import { siteOrigin } from './config'
import type { Deps } from './ports'

/**
 * The address a site's pages name as their own (canonical link, sitemap, Open Graph): the
 * customer's own domain once it's live, else the free <slug>.<base> address.
 */
export async function liveOrigin(deps: Deps, ref: string, slug: string): Promise<string> {
  const own = await deps.domains.byRef(ref).catch(err => {
    // Never in the way of publishing: the free address is always right.
    console.warn(`Could not read ${ref}'s own domain`, err)
    return null
  })
  return own?.status === 'active' ? `https://${own.hostname}` : siteOrigin(deps.config, slug)
}
