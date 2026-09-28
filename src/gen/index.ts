/**
 * Procedural section generator. Framework-free and platform-free: the same code runs in
 * the builder, in tests and (later) in whatever publishes plain HTML. The only DOM code
 * is the measuring adapter in ./dom, which callers opt into.
 */
import { FALLBACK_SPEC } from './hero/archetypes'
import type { HeroContent } from './hero/content'
import { estimateMeasurer } from './hero/estimate'
import { generateHeroOptions } from './hero/options'
import { renderHero } from './hero/render'
import type { HeroSpec, SiteStyle } from './schema'

export * from './schema'
export { resolveSiteStyle } from './style'
export { fontFaceCss, siteFontFaces, fontFileName, SITE_FONT_FILES } from './fonts'
export { mulberry32, randomSeed, hashString } from './rng'
export { THEMES, ALL_FONT_FAMILIES } from './themes'
export type { HeroContent } from './hero/content'
export { ARCHETYPES, ARCHETYPE_KEYS, FALLBACK_SPEC } from './hero/archetypes'
export { generateHeroSpec, allowedArchetypes, specKey } from './hero/generate'
export { generateHeroOptions, nextBatchSeed, candidateSeed, pickDistinct, BATCH_SIZE, SHOW } from './hero/options'
export type { HeroCandidate, HeroOptions } from './hero/options'
export { staticChecks, measuredChecks } from './hero/checks'
export type { Check } from './hero/checks'
export type { Measurer, HeroMeasurement } from './hero/measure'
export { estimateMeasurer } from './hero/estimate'
export { repairHero, fitFailures } from './hero/repair'
export type { FitResult } from './hero/repair'
export { FRAME, HERO_TITLE_ID } from './hero/metrics'

/** The stylesheet every generated section needs. Include once per page. */
export { HERO_CSS as GEN_CSS } from './hero/css'

export type SectionSpec = HeroSpec

/** Renders a stored section spec to HTML with the site's style and content. */
export function renderSection(spec: SectionSpec, style: SiteStyle, content: HeroContent): string {
  return renderHero(spec, style, content)
}

/**
 * A hero for a site that has none picked yet, without a DOM: the best candidate of the
 * first batch under the (pessimistic) estimator, or the always-valid fallback.
 */
export function defaultHeroSpec(batchSeed: number, content: HeroContent, style: SiteStyle): HeroSpec {
  const { shown } = generateHeroOptions({ batchSeed, content, style, measurer: estimateMeasurer, show: 1 })
  return shown[0]?.spec ?? FALLBACK_SPEC
}
