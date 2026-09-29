import { mixSeeds, mulberry32, pickWeighted } from '../rng'
import type { SiteStyle } from '../schema'
import type { AnySpec, Band, Check, Generated, Measurement, Measurer, Score, SectionDef } from './types'

export interface Candidate<S extends AnySpec = AnySpec> {
  seed: number
  spec: S
  checks: Check[]
  valid: boolean
  score: Score
  features: number[]
}

export interface Options<S extends AnySpec = AnySpec> {
  batchSeed: number
  generated: number
  /** The most different valid candidates, best first. */
  shown: Candidate<S>[]
  /** Every candidate that passed, shown or held back. */
  valid: Candidate<S>[]
  rejected: Candidate<S>[]
  /** Archetypes the content ruled out, with the reason. */
  gated: { archetype: string; why: string }[]
}

export interface OptionsRequest<C> {
  batchSeed: number
  content: C
  style: SiteStyle
  measurer: Measurer
  count?: number
  show?: number
}

export const BATCH_SIZE = 40
export const SHOW = 6

/** Candidate i of a batch. */
export const candidateSeed = (batchSeed: number, i: number): number => mixSeeds(batchSeed, i)
/** Seed for the next "New options" batch. */
export const nextBatchSeed = (batchSeed: number): number => mixSeeds(batchSeed, 0x5eed)

/** Stable identity of a spec, for de-duplication and for finding a stored pick among options. */
export function specKey(spec: AnySpec): string {
  const params = Object.entries(spec.params).sort(([a], [b]) => a.localeCompare(b))
  return `${spec.section}:${spec.archetype}:${JSON.stringify(params)}`
}

export const distance = (a: readonly number[], b: readonly number[]): number =>
  Math.sqrt(a.reduce((sum, v, i) => sum + (v - (b[i] ?? 0)) ** 2, 0))

/* eslint-disable @typescript-eslint/no-explicit-any -- archetype param types are per section; the pipeline treats them opaquely */
type AnyDef = SectionDef<any, any>

export const archetypeKeys = (def: AnyDef): string[] => Object.keys(def.archetypes)
export const allowed = (def: AnyDef, content: unknown): string[] =>
  archetypeKeys(def).filter(k => def.archetypes[k].gate(content as never))
/** A section appears on the page only if its content allows at least one layout. */
export const isPresent = (def: AnyDef, content: unknown): boolean => allowed(def, content).length > 0

/** One candidate. Pure: the same seed, content and style always give the same spec. */
export function generateSpec<S extends AnySpec, C>(def: SectionDef<S, C>, seed: number, content: C, style: SiteStyle): S {
  const r = mulberry32(Math.imul(seed, 9973) + 17)
  const table = def.weights[style.theme]
  const weights = Object.fromEntries(allowed(def, content).map(k => [k, table[k] ?? 1]))
  const archetype = pickWeighted<string>(r, weights)
  const params = (def.archetypes[archetype].params as (r: unknown, c: C) => object)(r, content)
  return { v: 1, section: def.type, archetype, params } as S
}

/** A point in design space for the distinctness filter. The archetype dominates. */
export function features(def: AnyDef, spec: AnySpec): number[] {
  const oneHot = archetypeKeys(def).map(k => (k === spec.archetype ? 1.3 : 0))
  const params = (def.archetypes[spec.archetype]?.features(spec.params as never) ?? []).map(x => x * 0.45)
  while (params.length < 5) params.push(0)
  return [...oneHot, ...params]
}

/** Soft score: the section's own, or how much the theme favours the archetype. */
function score(def: AnyDef, spec: AnySpec, style: SiteStyle): Score {
  if (def.score) return def.score(spec, style)
  const table = def.weights[style.theme]
  const max = Math.max(1, ...Object.values(table))
  return { total: (table[spec.archetype] ?? 1) / max }
}

/** Static checks on every band the rhythm may give this section; a rule passes only if it passes on all of them. */
export function staticChecksAll(def: AnyDef, spec: AnySpec, style: SiteStyle, bands: readonly Band[] = def.checkBands): Check[] {
  const byId = new Map<string, Check>()
  for (const band of bands) {
    for (const c of def.staticChecks(spec, style, band)) {
      const prev = byId.get(c.id)
      if (!prev || (prev.ok && !c.ok)) byId.set(c.id, c)
    }
  }
  return [...byId.values()]
}

export function measure(def: AnyDef, spec: AnySpec, content: unknown, style: SiteStyle, measurer: Measurer): Measurement {
  return measurer.measure({
    spec,
    render: () => def.render(spec, style, content, { band: def.checkBands[0], side: 'right' }),
    estimate: () => def.estimate(spec, style, content),
  })
}

function evaluate<S extends AnySpec, C>(def: SectionDef<S, C>, seed: number, spec: S, req: OptionsRequest<C>): Candidate<S> {
  const statics = staticChecksAll(def, spec, req.style)
  // Colour failures are cheap to find; skip layout for candidates already out.
  const measured = statics.every(c => c.ok) ? def.measuredChecks(spec, measure(def, spec, req.content, req.style, req.measurer)) : []
  const checks = [...statics, ...measured]
  return { seed, spec, checks, valid: measured.length > 0 && checks.every(c => c.ok), score: score(def, spec, req.style), features: features(def, spec) }
}

/** Greedy max-min selection: start from the best score, then keep adding whatever is furthest from the picks. */
export function pickDistinct<S extends AnySpec>(pool: readonly Candidate<S>[], show: number): Candidate<S>[] {
  const rest = [...pool].sort((a, b) => b.score.total - a.score.total || a.seed - b.seed)
  const picked: Candidate<S>[] = rest.length ? [rest.shift()!] : []
  while (picked.length < show && rest.length) {
    let best = -1
    let bestIdx = 0
    rest.forEach((c, i) => {
      const nearest = Math.min(...picked.map(p => distance(p.features, c.features)))
      const value = nearest * (0.6 + 0.4 * c.score.total)
      if (value > best) { best = value; bestIdx = i }
    })
    picked.push(rest.splice(bestIdx, 1)[0])
  }
  return picked
}

/**
 * The generator pipeline for any section: roll a batch, drop duplicates, reject anything
 * that breaks a hard rule, then show the most different survivors. Deterministic for a
 * given batch seed, content, style and measurer.
 */
export function generateOptions<S extends AnySpec, C>(def: SectionDef<S, C>, req: OptionsRequest<C>): Options<S> {
  const count = req.count ?? BATCH_SIZE
  const seen = new Set<string>()
  const candidates: Candidate<S>[] = []
  if (isPresent(def, req.content)) {
    for (let i = 0; i < count; i++) {
      const seed = candidateSeed(req.batchSeed, i)
      const spec = generateSpec(def, seed, req.content, req.style)
      const key = specKey(spec)
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push(evaluate(def, seed, spec, req))
    }
  }
  const valid = candidates.filter(c => c.valid)
  return {
    batchSeed: req.batchSeed,
    generated: count,
    shown: pickDistinct(valid, req.show ?? SHOW),
    valid,
    rejected: candidates.filter(c => !c.valid),
    gated: archetypeKeys(def).filter(k => !def.archetypes[k].gate(req.content as never)).map(k => ({ archetype: k, why: def.archetypes[k].why })),
  }
}

/** The rules a spec breaks with today's content and style (empty = it fits). */
export function fitFailures(def: AnyDef, spec: AnySpec, content: unknown, style: SiteStyle, measurer: Measurer): Check[] {
  const archetype = def.archetypes[spec.archetype]
  if (!archetype || !archetype.gate(content as never)) {
    return [{ id: 'content-gate', label: 'Needs content that’s missing', ok: false, detail: archetype?.why ?? 'unknown layout' }]
  }
  const statics = staticChecksAll(def, spec, style)
  if (statics.some(c => !c.ok)) return statics.filter(c => !c.ok)
  return def.measuredChecks(spec, measure(def, spec, content, style, measurer)).filter(c => !c.ok)
}

export type FitResult<S extends AnySpec = AnySpec> =
  | { status: 'fits' }
  /** The customer's own pick fits again and is back. */
  | { status: 'restored'; entry: Generated<S> }
  /** Switched to the nearest passing option from the same batch; the customer's pick is kept as `preferred`. */
  | { status: 'repaired'; entry: Generated<S>; failed: Check[] }
  /** Nothing in the batch passes; the simplest layout is used. */
  | { status: 'fallback'; entry: Generated<S>; failed: Check[] }

/**
 * Keeps a saved section honest after its content or style changed. The customer's own
 * pick is never lost: a repair keeps it as `preferred`, and as soon as it fits again it
 * comes back. Builder only; publishing never measures.
 */
export function repairSection<S extends AnySpec, C>(def: SectionDef<S, C>, saved: Generated<S>, content: C, style: SiteStyle, measurer: Measurer): FitResult<S> {
  if (saved.preferred && fitFailures(def, saved.preferred, content, style, measurer).length === 0) {
    return { status: 'restored', entry: { seed: saved.seed, spec: saved.preferred } }
  }
  const failed = fitFailures(def, saved.spec, content, style, measurer)
  if (failed.length === 0) return { status: 'fits' }

  const preferred = saved.preferred ?? saved.spec
  const { valid } = generateOptions(def, { batchSeed: saved.seed, content, style, measurer })
  const target = features(def, preferred)
  const skip = new Set([specKey(saved.spec), specKey(preferred)])
  const nearest = valid
    .filter(c => !skip.has(specKey(c.spec)))
    .sort((a, b) => distance(target, a.features) - distance(target, b.features) || b.score.total - a.score.total || a.seed - b.seed)[0]
  if (nearest) return { status: 'repaired', entry: { seed: saved.seed, spec: nearest.spec, preferred }, failed }
  return { status: 'fallback', entry: { seed: saved.seed, spec: def.fallback, preferred }, failed }
}

/** The best first option for a section nobody has picked yet, without a DOM. */
export function defaultSpec<S extends AnySpec, C>(def: SectionDef<S, C>, batchSeed: number, content: C, style: SiteStyle, measurer: Measurer): S {
  const { shown } = generateOptions(def, { batchSeed, content, style, measurer, show: 1 })
  return shown[0]?.spec ?? def.fallback
}
/* eslint-enable @typescript-eslint/no-explicit-any */
