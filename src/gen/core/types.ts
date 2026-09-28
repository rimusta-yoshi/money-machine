import type { z } from 'zod'
import type { Rng } from '../rng'
import type { SiteStyle, ThemeKey } from '../schema'
import type { PageContent } from '../content'

/** Every section the generator can build, in page order. */
export const SECTION_KEYS = [
  'hero', 'trust_bar', 'services', 'about', 'why_us', 'gallery', 'certifications', 'testimonials', 'areas', 'contact', 'footer',
] as const
export type SectionKey = typeof SECTION_KEYS[number]

/** Section backgrounds. ground/surface alternate; brand is the one loud band; ink is the footer; photo is a hero over its photo. */
export const BANDS = ['ground', 'surface', 'brand', 'ink', 'photo'] as const
export type Band = typeof BANDS[number]
export type Side = 'left' | 'right'

/** What the rhythm layer decides for one section. Derived from the whole page, never picked. */
export interface SectionRhythm {
  band: Band
  /** Which side the image sits on, for layouts that have one. */
  side: Side
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
}

export interface Score { total: number; [part: string]: number }

/** A stored section spec: plain JSON. */
export interface AnySpec {
  v: 1
  section: string
  archetype: string
  params: object
}

export interface Archetype<C, P> {
  label: string
  /** Content this layout needs to be honest (e.g. real photos, 3+ reviews). */
  gate: (c: C) => boolean
  why: string
  params: (r: Rng, c: C) => P
  /** Numbers in 0..1 describing the parameters, for the distinctness filter. */
  features: (p: P) => number[]
  /** Whether this layout has an image that the rhythm layer should place left or right. */
  sided?: boolean
  /** Whether it can carry the page's one loud brand-colour band. */
  loud?: boolean
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
  weights: Record<ThemeKey, Record<string, number>>
  schema: z.ZodType<S>
  /** Used when a saved spec no longer fits and nothing else does. Its gate is the section's presence gate. */
  fallback: S
  /** Backgrounds a candidate must pass on (the rhythm may give it any of these). */
  checkBands: readonly Band[]
  /** A band the section always has, whatever the rhythm (hero tone, footer ink). */
  fixedBand?: (spec: S) => Band | null
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
