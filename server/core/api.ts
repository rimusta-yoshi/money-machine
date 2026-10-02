import { STOCK_PHOTO_FILES } from '../../src/sample/stockPhotoFiles'
import { apiHost, previewHost } from './config'
import { createDraft, getDraft, saveDraft, uploadPhoto } from './drafts'
import { corsHeaders, errorResponse, HttpError, htmlPage, json, withHeaders } from './http'
import type { Deps } from './ports'
import { createPreview, servePreviewHost } from './preview'
import { publish, slugStatus } from './publish'
import { serveObject } from './static'

function decodeSegment(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    throw new HttpError(400, 'bad_request', 'That address could not be read.')
  }
}

type Handler = (req: Request, deps: Deps, param: string) => Promise<Response>

/** The builder's API, versioned so later phases can change shape without breaking old builders. */
const ROUTES: [method: string, path: RegExp, handler: Handler][] = [
  ['POST', /^\/v1\/drafts$/, createDraft],
  ['GET', /^\/v1\/draft$/, getDraft],
  ['PUT', /^\/v1\/draft$/, saveDraft],
  ['POST', /^\/v1\/draft\/photos$/, uploadPhoto],
  ['POST', /^\/v1\/draft\/preview$/, createPreview],
  ['POST', /^\/v1\/draft\/publish$/, publish],
  ['GET', /^\/v1\/slugs\/([^/]{1,64})$/, (req, deps, slug) => slugStatus(req, deps, decodeSegment(slug))],
  ['GET', /^\/samples\/([a-z-]+\.jpg)$/, sample],
  ['GET', /^\/health$/, async () => json({ ok: true })],
]

/** The builder's sample stock photos (never published), from storage, for listed builder origins. */
async function sample(req: Request, deps: Deps, file: string): Promise<Response> {
  if (!STOCK_PHOTO_FILES.includes(file)) throw new HttpError(404, 'not_found', 'Not found.')
  const res = await serveObject(req, deps, `samples/${file}`, { 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' })
  if (!res) throw new HttpError(404, 'not_found', 'Not found.')
  return res
}

async function handleApiHost(req: Request, deps: Deps): Promise<Response> {
  const origin = req.headers.get('Origin')
  const cors = corsHeaders(origin, deps.config.builderOrigins)
  // Browsers send Origin on cross-site calls: only the builder may make them.
  if (origin && !deps.config.builderOrigins.has(origin)) return json({ error: 'forbidden_origin', message: 'Not allowed from this site.' }, 403, cors)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  const path = new URL(req.url).pathname
  try {
    for (const [method, pattern, handler] of ROUTES) {
      const m = pattern.exec(path)
      if (m && (method === req.method || (method === 'GET' && req.method === 'HEAD'))) return withHeaders(await handler(req, deps, m[1] ?? ''), cors)
    }
    const known = ROUTES.some(([, pattern]) => pattern.test(path))
    throw known ? new HttpError(405, 'method_not_allowed', 'Method not allowed.') : new HttpError(404, 'not_found', 'Not found.')
  } catch (err) {
    return withHeaders(errorResponse(err), cors)
  }
}

/** The API worker: the builder's API on api.<base>, preview links on preview.<base>. */
export async function handleApi(req: Request, deps: Deps): Promise<Response> {
  const host = new URL(req.url).host.toLowerCase()
  try {
    if (host === apiHost(deps.config)) return await handleApiHost(req, deps)
    if (host === previewHost(deps.config)) return await servePreviewHost(req, deps)
    return htmlPage(404, 'Page not found', 'There is nothing at this address.', {})
  } catch (err) {
    console.error('Request failed', err)
    return htmlPage(500, 'Something went wrong', 'Please try again in a minute.', {})
  }
}
