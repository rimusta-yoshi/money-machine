/**
 * Site addresses: <slug>.<base domain>. A slug is one DNS label, made from the business
 * name and editable by the customer. Shared by the builder (live checks while typing) and
 * the API (the real check, plus uniqueness in the database).
 */

export const SLUG_MIN = 3
export const SLUG_MAX = 40

/** Our own hosts, mail and infrastructure names, and words that would look like us. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'www', 'api', 'admin', 'preview', 'app', 'apps', 'mail', 'email', 'smtp', 'imap', 'pop', 'ftp', 'webmail', 'mx',
  'ns', 'ns1', 'ns2', 'dns', 'autodiscover', 'autoconfig', 'blog', 'help', 'support', 'status', 'docs', 'dashboard',
  'login', 'logout', 'signin', 'signup', 'register', 'account', 'accounts', 'billing', 'pay', 'payment', 'payments',
  'checkout', 'static', 'assets', 'cdn', 'img', 'images', 'media', 'files', 'fonts', 'photos', 'dev', 'staging',
  'test', 'demo', 'beta', 'root', 'security', 'abuse', 'postmaster', 'hostmaster', 'webmaster', 'privacy', 'terms',
  'legal', 'about', 'news', 'shop', 'store', 'my', 'go', 'auth', 'oauth', 'sso', 'id', 'internal', 'localhost',
  'siteblocks', 'site-blocks', 'businessblocks', 'business-blocks', 'example', 'sample', 'samples', 'official',
])

/**
 * A basic filter, matched against whole words of the slug so real places survive
 * (Scunthorpe, Essex, Cockermouth, Penistone). A few words are blocked anywhere in it.
 */
const BLOCKED_WORDS: ReadonlySet<string> = new Set([
  'shit', 'shite', 'cunt', 'cunts', 'twat', 'wank', 'wanker', 'wankers', 'bollocks', 'prick', 'cock', 'cocks', 'piss',
  'slut', 'whore', 'bastard', 'arse', 'arsehole', 'asshole', 'porn', 'sex', 'nazi', 'rape', 'rapist', 'retard',
  'spastic', 'paki', 'tranny', 'dildo', 'tits',
])
const BLOCKED_ANYWHERE = ['fuck', 'nigger', 'nigga', 'faggot', 'paedo', 'pedophile', 'motherfuck']

export type SlugProblem = 'short' | 'long' | 'chars' | 'reserved' | 'blocked'

export type SlugCheck = { ok: true; slug: string } | { ok: false; problem: SlugProblem; message: string }

const MESSAGES: Record<SlugProblem, string> = {
  short: `Use at least ${SLUG_MIN} letters or numbers.`,
  long: `Keep it to ${SLUG_MAX} characters or fewer.`,
  chars: 'Use lowercase letters, numbers and single dashes, starting and ending with a letter or number.',
  reserved: 'That address is reserved. Try adding your town or trade.',
  blocked: "That address isn't allowed. Try another.",
}

const SHAPE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/** Checks a slug's shape and words (not whether it's taken: the API does that). */
export function checkSlug(input: string): SlugCheck {
  const slug = input.trim()
  const fail = (problem: SlugProblem): SlugCheck => ({ ok: false, problem, message: MESSAGES[problem] })
  if (slug.length > SLUG_MAX) return fail('long')
  if (!SHAPE.test(slug) || slug.includes('--')) return slug.length < SLUG_MIN && /^[a-z0-9-]*$/.test(slug) ? fail('short') : fail('chars')
  if (slug.length < SLUG_MIN) return fail('short')
  if (RESERVED_SLUGS.has(slug)) return fail('reserved')
  const joined = slug.replace(/-/g, '')
  if (slug.split('-').some(w => BLOCKED_WORDS.has(w)) || BLOCKED_ANYWHERE.some(w => joined.includes(w))) return fail('blocked')
  return { ok: true, slug }
}

/** Lowercase words joined by dashes: "Joe's Plumbing & Heating" -> "joes-plumbing-and-heating". Not checked. */
export function slugify(name: string): string {
  const words = name
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  let out = ''
  for (const w of words) {
    const next = out ? `${out}-${w}` : w
    if (next.length > SLUG_MAX) break
    out = next
  }
  return out || words[0]?.slice(0, SLUG_MAX) || ''
}

/**
 * Addresses to offer for a business, best first, all passing checkSlug: the name, then
 * the name with the town or trade, then numbered. The API picks the first that's free.
 */
export function slugCandidates(name: string, extras: { location?: string; trade?: string } = {}): string[] {
  const base = slugify(name)
  const withWord = (w?: string) => (w && base ? slugify(`${name} ${w}`) : '')
  const fallback = slugify(`${extras.trade ?? 'my'} ${extras.location ?? 'site'}`)
  const stem = checkSlug(base).ok ? base : fallback
  const numbered = [2, 3, 4, 5, 6, 7, 8, 9].map(n => `${stem.slice(0, SLUG_MAX - 2).replace(/-+$/, '')}-${n}`)
  const list = [base, withWord(extras.location), withWord(extras.trade), fallback, ...numbered]
  return [...new Set(list)].filter(s => checkSlug(s).ok)
}
