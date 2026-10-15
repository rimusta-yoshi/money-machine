import { PACKS } from '.'
import type { LivePack } from '.'

/**
 * "My business isn't listed": the closest business type to what someone typed, so they can
 * start with it for now. Plain word matching on each pack's names, synonyms and services
 * (no fuzzy guessing): "sparky" finds Electrician, "boiler engineer" finds Plumber, "florist"
 * finds nothing.
 */

/** "Roofers", "roofing" and "roofer" all come out as "roof"; "wallpapering" as "wallpap". */
export function stem(word: string): string {
  const cut = word.replace(/ings?$/, '').replace(/ers?$/, '').replace(/s$/, '')
  return cut.length >= 3 ? cut : word
}

export const wordsOf = (text: string): string[] =>
  text.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 1).map(stem)

const STOP = new Set(['and', 'the', 'for', 'my', 'of', 'a', 'an', 'in', 'on', 'we', 'do', 'i', 'business', 'company', 'service', 'local', 'small'].map(stem))

function score(p: LivePack, typed: readonly string[], phrase: string): number {
  const names = [p.name, p.plural, ...p.synonyms].map(n => n.toLowerCase())
  // A whole name or synonym inside what they typed is the strongest sign.
  const whole = names.some(n => ` ${phrase} `.includes(` ${n} `)) ? 10 : 0
  const nameWords = new Set(names.flatMap(wordsOf))
  const serviceWords = new Set(p.services.flatMap(s => wordsOf(s.name)))
  const words = typed.filter(w => !STOP.has(w))
  return whole + words.filter(w => nameWords.has(w)).length * 3 + words.filter(w => serviceWords.has(w)).length
}

/** The best match, or null when nothing they typed points at any pack. */
export function closestPack(text: string): LivePack | null {
  const phrase = text.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
  const typed = wordsOf(text)
  let best: { pack: LivePack; score: number } | null = null
  for (const pack of PACKS) {
    const s = score(pack, typed, phrase)
    if (s > 0 && (!best || s > best.score)) best = { pack, score: s }
  }
  return best?.pack ?? null
}
