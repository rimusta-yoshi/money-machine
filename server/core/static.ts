import { CACHE, notModified } from './http'
import type { Deps } from './ports'

const FONT = /^\/fonts\/([a-z0-9-]+\.woff2|LICENSES\.txt)$/

/** The self-hosted fonts every site shares, at /fonts/<file>. Null if the path isn't one. */
export async function serveFont(path: string, deps: Deps): Promise<Response | null> {
  const name = FONT.exec(path)?.[1]
  if (!name) return null
  const res = await deps.assets.font(name)
  if (!res || !res.ok) return null
  const type = name.endsWith('.woff2') ? 'font/woff2' : 'text/plain; charset=utf-8'
  return new Response(res.body, {
    headers: { 'Content-Type': type, 'Cache-Control': CACHE.fonts, 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*' },
  })
}

/** A stored object as a response, with its ETag (and a 304 when the browser has it already). */
export async function serveObject(req: Request, deps: Deps, key: string, headers: Record<string, string>): Promise<Response | null> {
  const obj = await deps.blobs.get(key)
  if (!obj) return null
  const all = { ...headers, 'Content-Type': obj.contentType, ETag: obj.etag }
  return notModified(req, obj.etag, all) ?? new Response(req.method === 'HEAD' ? null : obj.body, { headers: { ...all, 'Content-Length': String(obj.size) } })
}
