import { allowed, generateSpec } from '../core/pipeline'
import type { ArchetypeKey, HeroSpec, SiteStyle } from '../schema'
import { hero } from '../sections/hero'
import type { HeroContent } from './content'

export { specKey } from '../core/pipeline'

/** Archetypes the content allows. */
export const allowedArchetypes = (c: HeroContent): ArchetypeKey[] => allowed(hero, c) as ArchetypeKey[]

/** One candidate hero. Pure: the same seed, content and style always give the same spec. */
export const generateHeroSpec = (seed: number, content: HeroContent, style: SiteStyle): HeroSpec =>
  generateSpec(hero, seed, content, style)
