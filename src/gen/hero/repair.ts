import { fitFailures as fit, repairSection } from '../core/pipeline'
import type { FitResult as Result } from '../core/pipeline'
import type { Check, Generated, Measurer } from '../core/types'
import type { HeroSpec, SiteStyle } from '../schema'
import { hero } from '../sections/hero'
import type { HeroContent } from './content'

export type FitResult = Result<HeroSpec>

/** The rules a saved hero breaks with today's content and style (empty = still fits). */
export const fitFailures = (spec: HeroSpec, content: HeroContent, style: SiteStyle, measurer: Measurer): Check[] =>
  fit(hero, spec, content, style, measurer)

/** Re-checks a saved hero; see repairSection. */
export const repairHero = (saved: Generated<HeroSpec>, content: HeroContent, style: SiteStyle, measurer: Measurer): FitResult =>
  repairSection(hero, saved, content, style, measurer)
