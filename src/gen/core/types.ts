import type { z } from 'zod'
import type { Rng } from '../rng'
import type { SiteStyle, ThemeKey } from '../schema'
import type { PageContent } from '../content'
import type { Biome } from '../themes/types'

/** Every section the generator can build, in page order. */
export const SECTION_KEYS = [
  'hero', 'trust_bar', 'services', 'about', 'why_us', 'gallery', 'certifications', 'testimonials', 'areas', 'contact', 'footer',
] as const
export type SectionKey = typeof SECTION_KEYS[number]

/** Section backgrounds. ground/surface alternate; brand is the loud band; ink is the inverse band; photo is a hero over its photo. */
export const BANDS = ['ground', 'surface', 'brand', 'ink', 'photo'] as const
export type Band = typeof BANDS[number]
export type Side = 'left' | 'right'

/** What the rhythm layer decides for one section. Derived from the whole page, never picked. */
export interface SectionRhythm {
  band: Band
  /** Which side the image sits on, for layouts that have one. */
  side: Side
  /** Whether this section may draw its motif (the page's motif quotas are shared out in order). */
  motif: boolean
}

export interface Check {
  id: string
  label: string
  ok: boolean
  detail: string
}

/** Layout facts the hard checks need. Only a measurer produces these. */
export interface Measurement {
  desktop: { headlineLines: number; heightPx: number }
  phone: {
    headlineLines: number
    /** Bottom of the call button from the top of the section; Infinity when there is none. */
    callBottomPx: number
    /** Anything wider than the phone (clipped or scrolling sideways by accident). */
    overflowsWidth: boolean
  }
  /** Height of the smallest link, button or field, across both frames. */
  minTapPx: number
  /** Overlapping or rotated decorations that cover text or the call button, across both frames. */
  coveredText: number
}

export interface Score { total: number; [part: string]: number }

/** How far a spec's display type has stepped down its preset's ladder to fit (0 = as designed). */
export const MAX_STEP = 2
export type Step = 0 | 1 | 2

/** A stored section spec: plain JSON. */
export interface AnySpec {
  v: 2
  section: string
  archetype: string
  step: Step
  params: object
}

/** Everything an archetype's roll may look at. */
export interface RollContext<C> {
  content: C
  biome: Biome
  style: SiteStyle
}

/** Type sizes in px, for the soft score: the section's biggest element and the next biggest. */
export interface Focal { focal: number; second: number }

export interface Archetype<C, P> {
  label: string
  /** Content this layout needs to be honest (e.g. real photos, 3+ reviews). */
  gate: (c: C) => boolean
  why: string
  /** Rolls parameters inside the theme's ranges. */
  params: (r: Rng, ctx: RollContext<C>) => P
  /** Numbers in 0..1 describing the parameters, for the distinctness filter. */
  features: (p: P) => number[]
  /** The biggest and second-biggest type in this layout at a given preset, for scoring punch. */
  focal?: (p: P, sizes: Sizes) => Focal
  /** Extra theme rules for params the shared punch keys don't cover. */
  allows?: (p: P, t: Biome) => boolean
  /** Whether this layout has an image that the rhythm layer should place left or right. */
  sided?: boolean
  /** Whether it can carry a loud brand-colour band. */
  loud?: boolean
}

/** Type sizes for one section at its step (see themes/sizes.ts). */
export interface Sizes {
  h1: number; h1m: number
  h2: number; h2m: number
  xl: number; xlm: number
  h3: number
  lead: number
  body: number
}

/**
 * One section type: its archetypes, how to read its content from the page, how to render
 * and check it. The generic pipeline (options, repair, rhythm) works on any of these.
 */
export interface SectionDef<S extends AnySpec = AnySpec, C = unknown> {
  type: SectionKey
  label: string
  view: (page: PageContent) => C
  archetypes: Record<string, Archetype<C, never>>
  /** How likely each archetype is per theme. Missing or 0 means the theme never uses it. */
  weights: Record<ThemeKey, Record<string, number>>
  schema: z.ZodType<S>
  /** Used when a saved spec no longer fits and nothing else does. Allowed in every theme; its gate is the section's presence gate. */
  fallback: S
  /** Backgrounds a candidate must pass on (the rhythm may give it any of these). */
  checkBands: readonly Band[]
  /** A band the section always has, whatever the rhythm (hero tone, footer). */
  fixedBand?: (spec: S) => Band | null
  /** Whether this layout sits in an inset panel (so its band is never plain ground). */
  panel?: (spec: S) => boolean
  render: (spec: S, style: SiteStyle, content: C, rhythm: SectionRhythm) => string
  staticChecks: (spec: S, style: SiteStyle, band: Band) => Check[]
  measuredChecks: (spec: S, m: Measurement) => Check[]
  estimate: (spec: S, style: SiteStyle, content: C) => Measurement
  score?: (spec: S, style: SiteStyle) => Score
}

export interface MeasureInput {
  spec: AnySpec
  /** The section's HTML, rendered on demand (the estimator never needs it). */
  render: () => string
  /** A layout estimate for places without a DOM. */
  estimate: () => Measurement
}

/** The generator's only window onto layout: the DOM adapter in the browser, the estimator elsewhere. */
export interface Measurer {
  measure(input: MeasureInput): Measurement
}

/** A generated section as stored: batch seed, the resolved spec, and the customer's own pick if a repair replaced it. */
export interface Generated<S extends AnySpec = AnySpec> {
  seed: number
  spec: S
  preferred?: S
}
