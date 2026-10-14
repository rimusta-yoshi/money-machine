/**
 * Where a visitor came from, for judging ads: `?src=` (our own ad links) or the standard
 * utm_source / utm_campaign. Shared by the homepage, the builder and the server, so all three
 * clean it the same way. Sources come from a short allowlist (anything else is "other"); campaigns
 * are short tags, never anything that looks like an email or a phone number.
 */

export interface Source {
  src: string | null
  campaign: string | null
}

export const NO_SOURCE: Source = { src: null, campaign: null }

const MAX = 40

/** A short lower-case tag (letters, digits, - and _), or null. Anything like an email or a phone number is dropped. */
export function cleanTag(value: unknown): string | null {
  if (typeof value !== 'string' || value.includes('@') || /\d{7,}/.test(value.replace(/[\s().+-]/g, ''))) return null
  const tag = value.trim().toLowerCase().replace(/[\s.]+/g, '-').replace(/[^a-z0-9_-]/g, '').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').slice(0, MAX)
  return tag || null
}

/** The ad sources the dashboard tracks. Anything else is counted as OTHER_SOURCE; none (or "direct") as direct. */
// madewith: the "Made with Local Blocks" link on customers' sites.
export const KNOWN_SOURCES = ['fb', 'ig', 'google', 'tiktok', 'leaflet', 'madewith'] as const
export const OTHER_SOURCE = 'other'
/** Common spellings of the known sources. */
const ALIASES: Record<string, string> = { facebook: 'fb', instagram: 'ig' }

/** A source tag from the allowlist, OTHER_SOURCE for any other value, or null (direct) for none. */
export function cleanSource(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const tag = cleanTag(value)
  if (tag === 'direct') return null
  const known = tag ? ALIASES[tag] ?? tag : null
  return known && (KNOWN_SOURCES as readonly string[]).includes(known) ? known : OTHER_SOURCE
}

/** The source in an address's query string (?src= wins over utm_source). */
export function sourceFromSearch(search: string): Source {
  const q = new URLSearchParams(search)
  return { src: cleanSource(q.get('src') ?? q.get('utm_source')), campaign: cleanTag(q.get('utm_campaign')) }
}

/** A builder link that carries the source on (as ?src= and ?utm_campaign=). */
export function withSource(href: string, source: Source): string {
  if (!source.src && !source.campaign) return href
  const [path, query = ''] = href.split('?')
  const q = new URLSearchParams(query)
  if (source.src) q.set('src', source.src)
  if (source.campaign) q.set('utm_campaign', source.campaign)
  return `${path}?${q.toString()}`
}
