import { features, generateOptions } from '../core/pipeline'
import type { Candidate, Options, OptionsRequest } from '../core/pipeline'
import type { HeroSpec } from '../schema'
import { hero } from '../sections/hero'
import type { HeroContent } from './content'

export { BATCH_SIZE, SHOW, candidateSeed, nextBatchSeed, pickDistinct, distance } from '../core/pipeline'
export type HeroCandidate = Candidate<HeroSpec>
export type HeroOptions = Options<HeroSpec>

/** The generic pipeline, for the hero. */
export const generateHeroOptions = (req: OptionsRequest<HeroContent>): HeroOptions => generateOptions(hero, req)
export const heroFeatures = (spec: HeroSpec): number[] => features(hero, spec)
