import { mulberry32 } from '../gen/rng'
import type { TradeConfig } from '../types'
import { LIMITS } from './limits'
import type { Site } from './schema'

/** How many headline suggestions the builder offers. */
export const HEADLINE_SUGGESTIONS = 3

const TOWN = '{town}'

/** A fixed shuffle: the same seed always gives the same order. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const r = mulberry32(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Three hero headlines for this site, from its trade's pack: two naming the customer's town
 * when there is one (and it fits), the rest without. Varied per site (by its sample seed,
 * fixed when the site was made), so customers' sites don't all say the same thing.
 */
export function suggestHeadlines(site: Pick<Site, 'business' | 'sampleSeed' | 'style'>, trade: Pick<TradeConfig, 'headlines'>): string[] {
  const town = site.business.location.trim()
  const seed = (site.sampleSeed ?? site.style.seed) >>> 0
  const withTown = town
    ? shuffled(trade.headlines.filter(h => h.includes(TOWN)), seed)
      .map(h => h.replace(TOWN, town))
      .filter(h => h.length <= LIMITS.headline)
    : []
  const plain = shuffled(trade.headlines.filter(h => !h.includes(TOWN)), seed + 1)
  const picked = [...withTown.slice(0, 2), ...plain].slice(0, HEADLINE_SUGGESTIONS)
  return shuffled(picked, seed + 2)
}

/** Which suggestion the site's headline is, or -1 (none picked, or written by the customer). */
export const pickedSuggestion = (headline: string | null | undefined, suggestions: readonly string[]): number =>
  headline ? suggestions.indexOf(headline) : -1
