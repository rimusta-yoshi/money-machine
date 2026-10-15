import { filePath } from '../../src/publish/paths'
import { checkSlug } from '../../src/publish/slug'
import { slugFromHost } from './config'
import { CACHE, htmlPage, pageHeaders } from './http'
import type { Deps } from './ports'
import { ownHostForSlug, siteForHost } from './siteHosts'
import { goneKey, sitePrefix } from './storage'
import { serveFont, serveObject } from './static'

const cacheFor = (file: string): string => (/^(site-[0-9a-f]+\.css|photos\/.+)$/.test(file) ? CACHE.immutable : CACHE.page)
/** Photos, like the fonts, may be fetched by the builder for "Download your site": they're public anyway. */
const corsFor = (file: string): Record<string, string> => (file.startsWith('photos/') ? { 'Access-Control-Allow-Origin': '*' } : {})
/** Fetched by the builder (Download your site), so they stay on the free address rather than redirect. */
const SHARED_FILE = /^\/(fonts|photos)\//

/**
 * To the customer's own domain. From the free address it's remembered by browsers for an hour
 * only, so disconnecting a domain (or it lapsing) never strands visitors; the bare domain to www
 * is for good.
 */
function moved(host: string, url: URL, o: { forGood: boolean }): Response {
  return new Response(null, {
    status: 301,
    headers: { Location: `https://${host}${url.pathname}${url.search}`, 'Cache-Control': o.forGood ? 'public, max-age=86400' : 'public, max-age=3600' },
  })
}

/**
 * The site worker: <slug>.<base> serves that site's published files from storage, as they
 * are, and so does a customer's own domain (Cloudflare for SaaS sends those here too). Never
 * renders. The database is only read to know which site an own domain is (remembered a minute).
 */
export async function handleSite(req: Request, deps: Deps): Promise<Response> {
  const headers = pageHeaders({ noindex: deps.config.noindex })
  const notFound = (title: string, msg: string) => htmlPage(404, title, msg, headers)
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } })
    const url = new URL(req.url)
    const host = url.host.toLowerCase()
    let slug = slugFromHost(host, deps.config)
    // www. is our own homepage, not a customer site.
    if (slug === 'www') return Response.redirect(`https://${deps.config.baseDomain}${url.pathname}${url.search}`, 301)
    if (slug) {
      if (!checkSlug(slug).ok) return notFound('Page not found', 'There is nothing at this address.')
      // A site with its own domain live: the free address sends visitors (and search engines) there.
      const own = SHARED_FILE.test(url.pathname) ? null : await ownHostForSlug(deps, slug)
      if (own) return moved(own, url, { forGood: false })
    } else if (!host.endsWith(`.${deps.config.baseDomain}`) && host !== deps.config.baseDomain) {
      const site = await siteForHost(deps, host)
      if (!site) return notFound('No site here', 'There is nothing at this address.')
      // The bare domain (connected on Cloudflare's DNS) goes to the www address.
      if (host !== site.hostname) return moved(site.hostname, url, { forGood: true })
      slug = site.slug
    }
    if (!slug) return notFound('Page not found', 'There is nothing at this address.')
    const font = await serveFont(url.pathname, deps)
    if (font) return font
    const file = filePath(url.pathname)
    const res = file ? await serveObject(req, deps, sitePrefix(slug) + file, { ...headers, 'Cache-Control': cacheFor(file), ...corsFor(file) }) : null
    if (res) return res
    // A refunded site: every page of the address says so.
    if (await deps.blobs.get(goneKey(slug))) return htmlPage(410, 'This site is no longer available', 'There is nothing at this address any more.', headers)
    const home = file === 'index.html'
    return notFound(home ? 'No site here yet' : 'Page not found', home ? 'This address has not been published.' : 'There is nothing at this address.')
  } catch (err) {
    console.error('Site request failed', err)
    return htmlPage(500, 'Something went wrong', 'Please try again in a minute.', headers)
  }
}
