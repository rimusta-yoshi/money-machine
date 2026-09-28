import { z } from 'zod'
import type { ButtonStyle, SiteStyle, ThemeKey } from '../schema'
import { sectionContrast } from './contrast'
import { estimateSection, sectionMeasuredChecks } from './fit'
import { shell } from './markup'
import type { AnySpec, Archetype, Band, SectionDef, SectionKey, SectionRhythm } from './types'

/** A stored spec schema for one section: a discriminated union over its archetypes. */
export function specSchema<T extends SectionKey, A extends Record<string, z.ZodRawShape>>(section: T, archetypes: A) {
  const variants = Object.entries(archetypes).map(([archetype, params]) =>
    z.object({ v: z.literal(1), section: z.literal(section), archetype: z.literal(archetype), params: z.object(params).strict() }).strict(),
  )
  return z.discriminatedUnion('archetype', variants as unknown as [z.ZodObject, ...z.ZodObject[]]) as unknown as z.ZodType<{
    [K in keyof A & string]: { v: 1; section: T; archetype: K; params: z.infer<z.ZodObject<A[K]>> }
  }[keyof A & string]>
}

/** Params of one archetype of a spec union. */
export type ParamsFor<S extends AnySpec, K extends S['archetype']> = Extract<S, { archetype: K }>['params']

export type Archetypes<S extends AnySpec, C> = { [K in S['archetype']]: Archetype<C, ParamsFor<S, K>> }

interface Body {
  inner: string
  cls?: string
  vars?: string
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
  /** Whether this layout puts text on cards (checked for contrast too). */
  cards?: (spec: S) => boolean
  /** The button style this layout draws, if any. */
  button?: (spec: S, style: SiteStyle) => ButtonStyle | null
  body: (spec: S, style: SiteStyle, c: C, rhythm: SectionRhythm) => Body
  /** The heading and the longest texts, for the estimator. */
  words: (spec: S, c: C) => { title: string; texts: readonly string[] }
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
    render: (spec, style, c, rhythm) => {
      const b = o.body(spec, style, c, rhythm)
      return shell(o.type, style, rhythm, { archetype: spec.archetype, cls: b.cls, vars: b.vars, anchor: o.anchor, tag: o.tag }, b.inner)
    },
    staticChecks: (spec, style, band) =>
      sectionContrast(style, band, { cards: o.cards?.(spec) ?? true, button: o.button?.(spec, style) ?? null }),
    measuredChecks: (_spec, m) => sectionMeasuredChecks(m),
    estimate: (spec, style, c) => {
      const w = o.words(spec, c)
      return estimateSection(style, w.title, w.texts)
    },
  }
}
