/** Tiny HTML-string helpers. All content passes through esc(); URLs through safeUrl(). */

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export const esc = (s: string | number): string => String(s).replace(/[&<>"']/g, ch => ENTITIES[ch])

/** Only http(s), tel:, mailto:, same-page fragments and plain same-site paths (e.g. /privacy) are allowed as link targets. */
export function safeUrl(url: string): string {
  const u = url.trim()
  if (/^(https?:\/\/|tel:\+?\d+$|mailto:)/i.test(u) || /^#[\w-]*$/.test(u) || SITE_PATH.test(u)) return u
  return '#'
}

/** A same-site path: a slash, then words, digits, dots and dashes; never `//` (another host) or `..`. */
const SITE_PATH = /^\/(?:[A-Za-z0-9_-]+(?:\.[a-z0-9]+)?\/?)*$/

/**
 * Image sources: https, a base64 data URL of a web image format, or a published site's own
 * photo (/photos/<name>). Anything else becomes empty.
 */
export function safeImageUrl(url: string): string {
  const u = url.trim()
  if (/^https:\/\/[^\s"'<>]+$/i.test(u) || /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(u)) return u
  if (/^\/photos\/[a-z0-9-]+\.(webp|jpg|png)$/.test(u)) return u
  return ''
}

/** Joins class names, dropping empty ones. */
export const cx = (...names: (string | false | null | undefined)[]): string => names.filter(Boolean).join(' ')
