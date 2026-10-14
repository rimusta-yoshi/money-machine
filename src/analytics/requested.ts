/**
 * "My business isn't listed": what someone says their business is, counted anonymously so we
 * know which types to add next (the dashboard's "Requested business types"). Shared by the
 * builder and the server, so both clean it the same way. Only a short description of a
 * business is kept: anything that looks like an email, a phone number or a web address is
 * dropped, and nothing else about the visitor is ever sent or stored with it.
 */

export const MAX_REQUEST_CHARS = 60
const MAX_WORDS = 6

/** The cleaned description ("dog groomer"), or null if it isn't one we keep. */
export function cleanRequestedType(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw || raw.length > 200 || /@|https?:|www\.|\.(com|co|uk|org|net)\b/i.test(raw) || /\d{4,}/.test(raw.replace(/[\s().+-]/g, ''))) return null
  const text = raw.toLowerCase().replace(/[’`]/g, '\'').replace(/[^a-z&' -]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.length < 2 || text.length > MAX_REQUEST_CHARS || text.split(' ').length > MAX_WORDS || !/[a-z]{2}/.test(text)) return null
  return text
}
