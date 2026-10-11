/**
 * The old domain after a rename: every address on it, the bare domain and every subdomain,
 * moves permanently to the same place on the new one, keeping the path and query.
 * <slug>.<old> → <slug>.<new>, api.<old> → api.<new>, www.<old> → the new homepage.
 */

/** Where an address on the old domain now lives, or null if it isn't on the old domain. */
export function movedTo(url: URL, oldDomain: string, newDomain: string): string | null {
  const host = url.hostname.toLowerCase()
  const rest = `${url.pathname}${url.search}`
  if (host === oldDomain) return `https://${newDomain}${rest}`
  if (!host.endsWith(`.${oldDomain}`)) return null
  const label = host.slice(0, -oldDomain.length - 1)
  if (!/^[a-z0-9-]+$/.test(label)) return null
  return label === 'www' ? `https://${newDomain}${rest}` : `https://${label}.${newDomain}${rest}`
}

/** 301 for pages; 308 for anything else (a form post or an API call keeps its method and body). */
export function redirect(req: Request, oldDomain: string, newDomain: string): Response {
  const to = movedTo(new URL(req.url), oldDomain, newDomain)
  if (!to) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  const status = req.method === 'GET' || req.method === 'HEAD' ? 301 : 308
  return new Response(null, { status, headers: { Location: to, 'Cache-Control': 'public, max-age=86400' } })
}
