/**
 * Procedural section generator. Framework-free and platform-free: the same code runs in
 * the builder, in tests and (later) in whatever publishes plain HTML. The only DOM code
 * is the measuring adapter in ./dom, which callers opt into.
 */
export * from './schema'
export { resolveSiteStyle } from './style'
export { fontFaceCss, siteFontFaces, fontFileName, SITE_FONT_FILES } from './fonts'
export { mulberry32, randomSeed, hashString, mixSeeds } from './rng'
export { THEMES, THEME_CSS, ALL_FONT_FAMILIES } from './themes'
export type { Biome } from './themes'
export { sizesFor } from './themes/sizes'

// Sections
export { SECTION_KEYS, BANDS, FACETS, MAX_STEP } from './core/types'
export type { Facet, Shows, SectionKey, Band, Side, SectionRhythm, SectionDef, AnySpec, Generated, Measurer, Measurement, Check, MeasureInput, Step } from './core/types'
export {
  generateOptions, generateSpec, repairSection, fitFailures as sectionFitFailures, defaultSpec, specKey, isPresent,
  candidateSeed, nextBatchSeed, pickDistinct, features, staticChecksAll, punchScore, BATCH_SIZE, SHOW,
} from './core/pipeline'
export type { Candidate, Options, FitResult as SectionFitResult } from './core/pipeline'
export { outsideTheme } from './core/punch'
export { solveRhythm } from './core/rhythm'
export type { Rhythm, PageEntry, Settle } from './core/rhythm'
export { estimateMeasurer, cautiousMeasurer } from './core/estimate'
export { FRAME } from './core/fit'
export {
  SECTIONS, GEN_CSS, sectionBatch, viewOf, sectionPresent, presentSections, renderableSpec, resolvePage, rhythmOf,
  renderPageSection, renderPage,
} from './page'
export type { ResolvedSection, SavedSections, ResolveOptions, RenderPageOptions } from './page'
export type { PageContent, PagePhoto, PageReview } from './content'
export { businessName, facts } from './content'
export { heroView } from './hero/content'
export type { HeroContent } from './hero/content'
export type { HeroSpec } from './sections/hero'
export { renderHeader } from './sections/header'
export { sectionSchemas, generatedSectionsSchema } from './specs'
export type { SectionSpecs, GeneratedSections } from './specs'
