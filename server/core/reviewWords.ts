import type { Site } from '../../src/site/schema'

/**
 * Words that make a site worth a look by a person before or after it goes live: the sort of
 * thing a fake bank or login page says. Finding one never blocks anything and is never shown to
 * the customer; it only puts the site on the dashboard's "Sites to review" list.
 * Matched case-insensitively as whole words ("Bank" matches, "embankment" and "Banksy" don't).
 */
export const REVIEW_WORDS: readonly string[] = [
  'bank', 'banking', 'login', 'log in', 'sign in', 'verify your account', 'password', 'passcode',
  'crypto', 'bitcoin', 'wallet', 'seed phrase', 'pin number', 'account suspended',
]

/**
 * Everyday phrases that contain a listed word but are no cause for a look: "Bank holidays" in a
 * tradesperson's opening hours. Removed before the words are looked for.
 */
export const REVIEW_IGNORE: readonly string[] = ['bank holidays', 'bank holiday']

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A whole-word, any-case pattern: spaces in a phrase match any run of spaces. */
const wholeWords = (phrase: string, flags = 'iu'): RegExp =>
  new RegExp(`(?<![\\p{L}\\p{N}])${phrase.trim().split(/\s+/).map(escape).join('\\s+')}(?![\\p{L}\\p{N}])`, flags)

const WORD_PATTERNS = REVIEW_WORDS.map(word => ({ word, pattern: wholeWords(word) }))
const IGNORE_PATTERNS = REVIEW_IGNORE.map(phrase => wholeWords(phrase, 'giu'))

const texts = (list: readonly (string | null | undefined)[] | null | undefined): string[] =>
  (list ?? []).filter((t): t is string => typeof t === 'string' && t.length > 0)

/** Every bit of customer-written text a visitor can see on the site, in a fixed order. */
export function reviewText(site: Site): string[] {
  const { business: b, content: c } = site
  const photos = [c.photos.hero, c.photos.about, ...c.photos.gallery]
  // A newer field some records have: read defensively.
  const headline = (c as { headline?: unknown }).headline
  return texts([
    b.name, b.about, b.location,
    typeof headline === 'string' ? headline : null,
    ...(c.services ?? []),
    ...(c.badges ?? []),
    ...(c.whyUs ?? []).flatMap(w => [w.title, w.text]),
    c.certsNote,
    ...(c.areas ?? []),
    ...(c.hours ?? []).flatMap(h => [h.day, h.time]),
    c.jobsDone,
    ...(c.reviews ?? []).flatMap(r => [r.text, r.author, r.location]),
    ...photos.map(p => p?.alt),
  ])
}

/** The listed words found in the site's text, each once, in the list's order. */
export function reviewWords(site: Site): string[] {
  // Each field on its own, so a phrase never spans two fields ("…log" then "In Leeds…").
  const fields = reviewText(site).map(t => IGNORE_PATTERNS.reduce((s, p) => s.replace(p, ' '), t))
  return WORD_PATTERNS.filter(({ pattern }) => fields.some(f => pattern.test(f))).map(({ word }) => word)
}
