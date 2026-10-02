import { homeDocument, privacyDocument, siteCss, siteFavicon } from '../../src/publish/document'
import { tradeById } from '../../src/trades'
import { previewOrigin } from './config'
import { authDraft, storedRecord } from './drafts'
import { CACHE, htmlPage, json, pageHeaders } from './http'
import { rateLimit } from './limits'
import { draftPhotoKey, PHOTO_NAME } from './photos'
import type { Deps } from './ports'
import { serveFont, serveObject } from './static'
import { newPreviewToken, PREVIEW_TOKEN, REF, sha256Hex } from './tokens'

const DAY = 24 * 60 * 60 * 1000

/** A shareable, read-only link to the draft as last saved. Expires after PREVIEW_DAYS. */
export async function createPreview(req: Request, deps: Deps): Promise<Response> {
  await rateLimit(deps, req, 'preview')
  const draft = await authDraft(req, deps)
  const token = newPreviewToken()
  const now = deps.now()
  const expiresAt = now + deps.config.previewDays * DAY
  await deps.db.createPreview({ tokenHash: await sha256Hex(token), ref: draft.ref, now, expiresAt })
  return json({ url: `${previewOrigin(deps.config)}/${token}/`, expiresAt: new Date(expiresAt).toISOString() }, 201)
}

/** Preview pages are always noindex and never cached: they show the latest save. */
const HEADERS = { ...pageHeaders({ noindex: true }), 'Cache-Control': 'private, no-cache' }

const gone = () =>
  htmlPage(404, 'This preview link has expired', 'Preview links last for a while and then stop working. Ask for a new link from the site builder.', HEADERS)

/** Everything on the preview host: preview pages, draft photos, fonts and robots rules. */
export async function servePreviewHost(req: Request, deps: Deps): Promise<Response> {
  const path = new URL(req.url).pathname
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
  if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' } })
  const font = await serveFont(path, deps)
  if (font) return font

  const photo = /^\/photos\/([0-9a-f]+)\/([^/]+)$/.exec(path)
  if (photo && REF.test(photo[1]) && PHOTO_NAME.test(photo[2])) {
    // Shown by the builder from another origin as well as by preview pages.
    const res = await serveObject(req, deps, draftPhotoKey(photo[1], photo[2]), {
      'Cache-Control': CACHE.immutable, 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'cross-origin', 'X-Robots-Tag': 'noindex',
    })
    if (res) return res
  }

  const page = /^\/([A-Za-z0-9_-]+)(\/(?:privacy|site\.css|favicon\.svg)?)?$/.exec(path)
  if (!page || !PREVIEW_TOKEN.test(page[1])) return htmlPage(404, 'Page not found', 'There is nothing at this address.', HEADERS)
  try {
    await rateLimit(deps, req, 'previewView')
  } catch {
    return htmlPage(429, 'Too many requests', 'Please wait a little and try again.', { ...HEADERS, 'Retry-After': '600' })
  }
  const ref = await deps.db.previewRef(await sha256Hex(page[1]), deps.now())
  const draft = ref ? await deps.db.draftByRef(ref) : null
  const site = draft ? storedRecord(draft) : null
  if (!site) return gone()

  const trade = tradeById[site.tradeId]
  const base = `/${page[1]}`
  const opts = { origin: previewOrigin(deps.config), base, cssHref: `${base}/site.css`, noindex: true, preview: true, date: new Date(deps.now()) }
  const send = (body: string, type: string) => new Response(req.method === 'HEAD' ? null : body, { headers: { ...HEADERS, 'Content-Type': type } })
  switch (page[2] ?? '') {
    case '': return Response.redirect(new URL(`${base}/`, req.url).toString(), 301)
    case '/': return send(homeDocument(site, trade, opts), 'text/html; charset=utf-8')
    case '/privacy': return send(privacyDocument(site, trade, opts), 'text/html; charset=utf-8')
    case '/site.css': return send(siteCss(site), 'text/css; charset=utf-8')
    default: return send(siteFavicon(site, trade), 'image/svg+xml')
  }
}
