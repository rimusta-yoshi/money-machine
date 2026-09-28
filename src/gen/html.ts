/** Tiny HTML-string helpers. All content passes through esc(); URLs through safeUrl(). */

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export const esc = (s: string | number): string => String(s).replace(/[&<>"']/g, ch => ENTITIES[ch])

/** Only http(s), tel:, mailto: and same-page fragments are allowed as link or image targets. */
export function safeUrl(url: string): string {
  const u = url.trim()
  if (/^(https?:\/\/|tel:\+?\d+$|mailto:)/i.test(u) || /^#[\w-]*$/.test(u)) return u
  return '#'
}

/** Joins class names, dropping empty ones. */
export const cx = (...names: (string | false | null | undefined)[]): string => names.filter(Boolean).join(' ')
