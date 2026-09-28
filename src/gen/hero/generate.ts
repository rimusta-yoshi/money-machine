import { mulberry32, pickWeighted } from '../rng'
import { THEMES } from '../themes'
import type { ArchetypeKey, HeroSpec, SiteStyle } from '../schema'
import { ARCHETYPES, ARCHETYPE_KEYS } from './archetypes'
import type { HeroContent } from './content'

/** Archetypes the content allows. */
export const allowedArchetypes = (c: HeroContent): ArchetypeKey[] => ARCHETYPE_KEYS.filter(k => ARCHETYPES[k].gate(c))

/**
 * One candidate hero. Pure: the same seed, content and style always give the same spec.
 * The result is plain JSON, ready to store.
 */
export function generateHeroSpec(seed: number, content: HeroContent, style: SiteStyle): HeroSpec {
  const r = mulberry32(Math.imul(seed, 9973) + 17)
  const weights = Object.fromEntries(allowedArchetypes(content).map(k => [k, THEMES[style.theme].hero[k]]))
  const archetype = pickWeighted<ArchetypeKey>(r, weights)
  // Each branch keeps the archetype/params pairing that the union needs.
  const spec = { v: 1, section: 'hero', archetype, params: ARCHETYPES[archetype].params(r, content) }
  return spec as HeroSpec
}

/** Stable identity of a spec, for de-duplication and for finding a stored pick among options. */
export const specKey = (spec: HeroSpec): string => {
  const params = Object.entries(spec.params).sort(([a], [b]) => a.localeCompare(b))
  return `${spec.archetype}:${JSON.stringify(params)}`
}
