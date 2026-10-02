import { filePath } from '../../src/publish/paths'
import { checkSlug } from '../../src/publish/slug'
import { slugFromHost } from './config'
import { CACHE, htmlPage, pageHeaders } from './http'
import type { Deps } from './ports'
import { sitePrefix } from './storage'
import { serveFont, serveObject } from './static'

const cacheFor = (file: string): string => (/^(site-[0-9a-f]+\.css|photos\/.+)$/.test(file) ? CACHE.immutable : CACHE.page)

/**
 * The site worker: <slug>.<base> serves that site's published files from storage, as they
 * are. Never renders, never touches the database.
 */
export async function handleSite(req: Request, deps: Deps): Promise<Response> {
  const headers = pageHeaders({ noindex: deps.config.noindex })
  const notFound = (title: string, msg: string) => htmlPage(404, title, msg, headers)
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } })
    const url = new URL(req.url)
    const slug = slugFromHost(url.host, deps.config)
    if (!slug || !checkSlug(slug).ok) return notFound('Page not found', 'There is nothing at this address.')
    const font = await serveFont(url.pathname, deps)
    if (font) return font
    const file = filePath(url.pathname)
    const res = file ? await serveObject(req, deps, sitePrefix(slug) + file, { ...headers, 'Cache-Control': cacheFor(file) }) : null
    if (res) return res
    const home = file === 'index.html'
    return notFound(home ? 'No site here yet' : 'Page not found', home ? 'This address has not been published.' : 'There is nothing at this address.')
  } catch (err) {
    console.error('Site request failed', err)
    return htmlPage(500, 'Something went wrong', 'Please try again in a minute.', headers)
  }
}
