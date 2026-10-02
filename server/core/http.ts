/** Small HTTP helpers shared by the API, preview and site handlers. Web-standard Request/Response only. */

/** An error meant for the caller: its message is written for the person using the builder. */
export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly extra: Record<string, unknown>
  readonly headers: Record<string, string>

  constructor(status: number, code: string, message: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.extra = extra
    this.headers = headers
  }
}

const API_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...API_HEADERS, ...headers } })
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.code, message: err.message, ...err.extra }, err.status, err.headers)
  console.error('Unexpected server error', err)
  return json({ error: 'server_error', message: 'Something went wrong on our side. Please try again in a minute.' }, 500)
}

/** Reads a request body, refusing anything over `max` bytes before or while reading it. */
export async function readBody(req: Request, max: number): Promise<Uint8Array> {
  const tooBig = () => new HttpError(413, 'too_large', 'That is too big to save.')
  const declared = Number(req.headers.get('Content-Length') ?? '0')
  if (declared > max) throw tooBig()
  if (!req.body) return new Uint8Array()
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) {
      await reader.cancel()
      throw tooBig()
    }
    chunks.push(value)
  }
  const out = new Uint8Array(size)
  chunks.reduce((at, c) => (out.set(c, at), at + c.byteLength), 0)
  return out
}

export async function readJson(req: Request, max: number): Promise<unknown> {
  if (!/^application\/json\b/i.test(req.headers.get('Content-Type') ?? '')) throw new HttpError(415, 'bad_type', 'Send JSON.')
  const bytes = await readBody(req, max)
  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new HttpError(400, 'bad_json', 'That request could not be read.')
  }
}

/**
 * Headers for pages we serve (published sites and previews). No scripts run on customer
 * sites at all; styles, images and fonts come only from the site itself (plus the CSS's own
 * data: icons, which can't run code). Inline style
 * attributes carry each section's colours, so they're allowed (they can't run code).
 */
export function pageHeaders(o: { noindex: boolean }): Record<string, string> {
  return {
    'Content-Security-Policy': [
      "default-src 'none'", "img-src 'self' data:", "style-src 'self' 'unsafe-inline'", "font-src 'self'",
      "form-action 'self'", "base-uri 'none'", "frame-ancestors 'none'", 'upgrade-insecure-requests',
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Strict-Transport-Security': 'max-age=31536000',
    ...(o.noindex ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
  }
}

export const CACHE = {
  /** Pages: short, so a republish shows within a minute; revalidated with the ETag. */
  page: 'public, max-age=60, must-revalidate',
  /** Content-named files (stylesheet, photos). */
  immutable: 'public, max-age=31536000, immutable',
  fonts: 'public, max-age=2592000',
  none: 'no-store',
} as const

/** 304 when the browser already has this version. */
export function notModified(req: Request, etag: string, headers: Record<string, string>): Response | null {
  const match = req.headers.get('If-None-Match')
  if (!match || !match.split(',').some(t => t.trim().replace(/^W\//, '') === etag)) return null
  return new Response(null, { status: 304, headers: { ...headers, ETag: etag } })
}

/** CORS for the builder: only listed origins may call, and nothing carries cookies. */
export function corsHeaders(origin: string | null, allowed: ReadonlySet<string>): Record<string, string> {
  if (!origin || !allowed.has(origin)) return { Vary: 'Origin' }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Admin-Key',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

export const withHeaders = (res: Response, headers: Record<string, string>): Response => {
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, v)
  return out
}

export function htmlPage(status: number, title: string, message: string, headers: Record<string, string>): Response {
  const esc = (s: string) => s.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)
  const body = `<!doctype html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head>`
    + `<body style="margin:0;font:17px/1.5 system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#16181D;background:#fff"><main style="max-width:36rem;margin:15vh auto;padding:0 20px"><h1 style="font-size:28px;line-height:1.2">${esc(title)}</h1><p>${esc(message)}</p></main></body></html>\n`
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers } })
}
