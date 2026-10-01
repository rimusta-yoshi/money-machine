import { z } from 'zod'
import type { SiteStyle, ThemeKey } from '../schema'
import { THEMES } from '../themes'
import type { Biome, Break } from '../themes/types'
import { sectionContrast } from './contrast'
import type { ContrastOpts } from './contrast'
import { estimateSection, sectionMeasuredChecks } from './fit'
import { shell } from './markup'
import type { AnySpec, Archetype, Band, Check, Facet, Measurement, SectionDef, SectionKey, SectionRhythm, Step } from './types'

/** A stored spec schema for one section: a discriminated union over its archetypes. */
export function specSchema<T extends SectionKey, A extends Record<string, z.ZodRawShape>>(section: T, archetypes: A) {
  const variants = Object.entries(archetypes).map(([archetype, params]) =>
    z.object({
      v: z.literal(2),
      section: z.literal(section),
      archetype: z.literal(archetype),
      step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
      params: z.object(params).strict(),
    }).strict(),
  )
  return z.discriminatedUnion('archetype', variants as unknown as [z.ZodObject, ...z.ZodObject[]]) as unknown as z.ZodType<{
    [K in keyof A & string]: { v: 2; section: T; archetype: K; step: Step; params: z.infer<z.ZodObject<A[K]>> }
  }[keyof A & string]>
}

/** Params of one archetype of a spec union. */
export type ParamsFor<S extends AnySpec, K extends S['archetype']> = Extract<S, { archetype: K }>['params']

export type Archetypes<S extends AnySpec, C> = { [K in S['archetype']]: Archetype<C, ParamsFor<S, K>> }

export interface Body {
  inner: string
  cls?: string
  vars?: string
  brk?: Break
}

/** What a section body gets to render with. */
export interface BodyContext {
  style: SiteStyle
  biome: Biome
  rhythm: SectionRhythm
  /** Whether the rhythm lets this section draw its motif. */
  motif: boolean
}

interface SectionOpts<S extends AnySpec, C> {
  type: SectionKey
  label: string
  view: SectionDef<S, C>['view']
  archetypes: Archetypes<S, C>
  weights: Record<ThemeKey, Partial<Record<S['archetype'], number>>>
  schema: z.ZodType<S>
  fallback: S
  /** Page anchor for in-page links. */
  anchor?: string
  tag?: 'section' | 'footer'
  checkBands?: readonly Band[]
  fixedBand?: (spec: S) => Band | null
  panel?: (spec: S) => boolean
  /** Contrast options: cards on this layout, the button style it draws, a scrim. */
  contrast?: (spec: S, style: SiteStyle) => ContrastOpts
  measured?: (spec: S, m: Measurement) => Check[]
  estimate?: (spec: S, style: SiteStyle, c: C) => Measurement
  /** Leaves out content a neighbour already shows (see the rhythm's `omit`). */
  trim?: (c: C, omit: ReadonlySet<Facet>) => C
  body: (spec: S, c: C, ctx: BodyContext) => Body
  /** The heading, the longest texts and the heading's column width, for the estimator. */
  words: (spec: S, c: C, style: SiteStyle) => { title: string; texts: readonly string[]; col?: number; px?: { d: number; m: number } }
}

/** Builds a full SectionDef with the standard contrast, fit checks and estimate. */
export function defineSection<S extends AnySpec, C>(o: SectionOpts<S, C>): SectionDef<S, C> {
  return {
    type: o.type,
    label: o.label,
    view: o.view,
    archetypes: o.archetypes as unknown as SectionDef<S, C>['archetypes'],
    weights: o.weights as Record<ThemeKey, Record<string, number>>,
    schema: o.schema,
    fallback: o.fallback,
    checkBands: o.checkBands ?? ['ground', 'surface'],
    fixedBand: o.fixedBand,
    panel: o.panel ?? (spec => (spec.params as { brk?: Break }).brk === 'panel'),
    render: (spec, style, c, rhythm) => {
      const biome = THEMES[style.theme]
      const motif = rhythm.motif && ((spec.params as { motif?: string }).motif ?? 'none') !== 'none'
      const shown = o.trim && rhythm.omit?.length ? o.trim(c, new Set(rhythm.omit)) : c
      const b = o.body(spec, shown, { style, biome, rhythm, motif })
      return shell(o.type, style, rhythm, { archetype: spec.archetype, step: spec.step, cls: b.cls, vars: b.vars, anchor: o.anchor, tag: o.tag, brk: b.brk ?? (spec.params as { brk?: Break }).brk }, b.inner)
    },
    staticChecks: (spec, style, band) => sectionContrast(style, band, { cards: true, button: style.button, ...o.contrast?.(spec, style) }),
    measuredChecks: (spec, m) => (o.measured ?? ((_s: S, x: Measurement) => sectionMeasuredChecks(x)))(spec, m),
    estimate: (spec, style, c) => {
      if (o.estimate) return o.estimate(spec, style, c)
      const w = o.words(spec, c, style)
      return estimateSection(style, spec.step, w.title, w.texts, w.col, w.px)
    },
  }
}
