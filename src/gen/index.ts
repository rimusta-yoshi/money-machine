/**
 * Procedural section generator. Framework-free and platform-free: the same code runs in
 * the builder, in tests and (later) in whatever publishes plain HTML. The only DOM code
 * is the measuring adapter in ./dom, which callers opt into.
 */
import { FALLBACK_SPEC } from './hero/archetypes'
import type { HeroContent } from './hero/content'
import { estimateMeasurer } from './core/estimate'
import { generateHeroOptions } from './hero/options'
import type { HeroSpec, SiteStyle } from './schema'

export * from './schema'
export { resolveSiteStyle } from './style'
export { fontFaceCss, siteFontFaces, fontFileName, SITE_FONT_FILES } from './fonts'
export { mulberry32, randomSeed, hashString, mixSeeds } from './rng'
export { THEMES, ALL_FONT_FAMILIES } from './themes'

// Generic sections
export { SECTION_KEYS, BANDS } from './core/types'
export type { SectionKey, Band, Side, SectionRhythm, SectionDef, AnySpec, Generated, Measurer, Measurement, Check, MeasureInput } from './core/types'
export {
  generateOptions, generateSpec, repairSection, fitFailures as sectionFitFailures, defaultSpec, specKey, isPresent,
  candidateSeed, nextBatchSeed, pickDistinct, features, staticChecksAll, BATCH_SIZE, SHOW,
} from './core/pipeline'
export type { Candidate, Options, FitResult as SectionFitResult } from './core/pipeline'
export { solveRhythm, LOUD_PRIORITY } from './core/rhythm'
export type { Rhythm, PageEntry } from './core/rhythm'
export { estimateMeasurer } from './core/estimate'
export {
  SECTIONS, GEN_CSS, sectionBatch, viewOf, sectionPresent, presentSections, renderableSpec, resolvePage, rhythmOf,
  renderPageSection, renderPage,
} from './page'
export type { ResolvedSection, SavedSections, ResolveOptions } from './page'
export type { PageContent, PagePhoto, PageReview } from './content'
export { heroView, businessName } from './content'
export { renderHeader } from './sections/header'
export { sectionSchemas, generatedSectionsSchema } from './specs'
export type { SectionSpecs, GeneratedSections } from './specs'

// Hero (kept for its dedicated tests and callers)
export type { HeroContent } from './hero/content'
export { ARCHETYPES, ARCHETYPE_KEYS, FALLBACK_SPEC } from './hero/archetypes'
export { generateHeroSpec, allowedArchetypes } from './hero/generate'
export { generateHeroOptions } from './hero/options'
export type { HeroCandidate, HeroOptions } from './hero/options'
export { staticChecks, measuredChecks } from './hero/checks'
export type { HeroMeasurement } from './hero/measure'
export { repairHero, fitFailures } from './hero/repair'
export type { FitResult } from './hero/repair'
export { FRAME, HERO_TITLE_ID } from './hero/metrics'
export { renderHero } from './hero/render'

/**
 * A hero for a site that has none picked yet, without a DOM: the best candidate of the
 * first batch under the (pessimistic) estimator, or the always-valid fallback.
 */
export function defaultHeroSpec(batchSeed: number, content: HeroContent, style: SiteStyle): HeroSpec {
  const { shown } = generateHeroOptions({ batchSeed, content, style, measurer: estimateMeasurer, show: 1 })
  return shown[0]?.spec ?? FALLBACK_SPEC
}
