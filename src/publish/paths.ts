/** Where a published site's files live, as served. Tiny on purpose: the site worker needs only this. */

export const PRIVACY_PATH = '/privacy'

/**
 * The stored file a request path maps to, or null if no site file could live there:
 * "/" -> index.html, "/privacy" -> privacy.html, "/photos/x.webp" -> photos/x.webp.
 * Only plain names: no dots-only segments, no encoded characters, nothing nested deeper.
 */
export function filePath(path: string): string | null {
  if (path === '/' || path === '/index.html') return 'index.html'
  if (path === PRIVACY_PATH || path === `${PRIVACY_PATH}/`) return 'privacy.html'
  const m = /^\/((?:photos\/)?[a-z0-9][a-z0-9-]*\.(?:css|svg|xml|txt|webp|jpg|png))$/.exec(path)
  return m ? m[1] : null
}
