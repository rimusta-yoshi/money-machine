/**
 * A plain text-similarity check between packs' landing pages, because search engines punish
 * pages that only swap one word for another. Each pack's own names are blanked out first, so
 * "Websites for plumbers" and "Websites for roofers" count as the same words.
 */

/** Below this share of shared five-word runs, two pages read as different (calibrated on the first five trades, all under 0.05). */
export const MAX_SIMILARITY = 0.15
/** A run of this many identical words in two packs is reported, so it can be reworded. */
export const SHARED_PHRASE_WORDS = 8
const SHINGLE = 5

export interface Wording {
  id: string
  /** Every sentence a pack's page says in its own words. */
  text: readonly string[]
  /** The pack's own names, blanked out before comparing. */
  names: readonly string[]
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function words(text: string, names: readonly string[]): string[] {
  const blanked = [...names].sort((a, b) => b.length - a.length)
    .reduce((t, n) => t.replace(new RegExp(`\\b${escape(n.toLowerCase())}s?\\b`, 'g'), ' trade '), text.toLowerCase())
  return blanked.replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
}

const runs = (w: readonly string[], n: number): Set<string> =>
  new Set(Array.from({ length: Math.max(0, w.length - n + 1) }, (_, i) => w.slice(i, i + n).join(' ')))

/** Shared five-word runs over all five-word runs in the two texts (Jaccard), 0 to 1. */
export function similarity(a: readonly string[], b: readonly string[]): number {
  const x = runs(a, SHINGLE)
  const y = runs(b, SHINGLE)
  const shared = [...x].filter(s => y.has(s)).length
  const all = x.size + y.size - shared
  return all ? shared / all : 0
}

/** Runs of SHARED_PHRASE_WORDS identical words that appear in both, merged into longer phrases. */
export function sharedPhrases(a: Wording, b: Wording): string[] {
  const bRuns = new Set(b.text.flatMap(t => [...runs(words(t, b.names), SHARED_PHRASE_WORDS)]))
  return [...new Set(a.text.flatMap(t => {
    const w = words(t, a.names)
    const hits = Array.from({ length: Math.max(0, w.length - SHARED_PHRASE_WORDS + 1) }, (_, i) => bRuns.has(w.slice(i, i + SHARED_PHRASE_WORDS).join(' ')))
    // Merge overlapping hits into one phrase each.
    const phrases: string[] = []
    let start = -1
    hits.forEach((hit, i) => {
      if (hit && start < 0) start = i
      if ((!hit || i === hits.length - 1) && start >= 0) {
        const end = hit ? i : i - 1
        phrases.push(w.slice(start, end + SHARED_PHRASE_WORDS).join(' '))
        start = -1
      }
    })
    return phrases
  }))]
}

export interface Overlap { a: string; b: string; score: number; phrases: string[] }

/** Every pair of packs, most alike first. */
export function overlaps(all: readonly Wording[]): Overlap[] {
  const pairs = all.flatMap((a, i) => all.slice(i + 1).map(b => ({
    a: a.id,
    b: b.id,
    score: similarity(a.text.flatMap(t => words(t, a.names)), b.text.flatMap(t => words(t, b.names))),
    phrases: sharedPhrases(a, b),
  })))
  return pairs.sort((x, y) => y.score - x.score)
}
