import { mixSeeds, mulberry32, pickWeighted } from '../rng'
import type { SiteStyle } from '../schema'
import { THEMES } from '../themes'
import { sizesFor } from '../themes/sizes'
import { themeCheck } from './punch'
import { MAX_STEP } from './types'
import type { AnySpec, Band, Check, Generated, Measurement, Measurer, Score, SectionDef, Side, Step } from './types'

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
  return `${spec.section}:${spec.archetype}:${spec.step}:${JSON.stringify(params)}`
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

/** Archetypes this theme uses and this content allows, with their weights. */
function themeWeights(def: AnyDef, content: unknown, style: SiteStyle): Record<string, number> {
  const table = def.weights[style.theme] ?? {}
  return Object.fromEntries(allowed(def, content).map(k => [k, table[k] ?? 0]).filter(([, w]) => (w as number) > 0))
}

/**
 * One candidate. Pure: the same seed, content and style always give the same spec. It
 * starts at its preset's full size (step 0); evaluation steps it down only to fit.
 */
export function generateSpec<S extends AnySpec, C>(def: SectionDef<S, C>, seed: number, content: C, style: SiteStyle): S {
  const r = mulberry32(Math.imul(seed, 9973) + 17)
  const weights = themeWeights(def, content, style)
  if (!Object.keys(weights).length) return def.fallback
  const archetype = pickWeighted<string>(r, weights)
  const params = (def.archetypes[archetype].params as (r: unknown, ctx: unknown) => object)(r, { content, biome: THEMES[style.theme], style })
  return { v: 2, section: def.type, archetype, step: 0, params } as S
}

/** A point in design space for the distinctness filter. The archetype dominates. */
export function features(def: AnyDef, spec: AnySpec): number[] {
  const oneHot = archetypeKeys(def).map(k => (k === spec.archetype ? 1.3 : 0))
  const params = (def.archetypes[spec.archetype]?.features(spec.params as never) ?? []).map(x => x * 0.45)
  return [...oneHot, ...params, ...Array<number>(Math.max(0, 6 - params.length)).fill(0)]
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

/**
 * Punch: one clear focal point, much bigger than the body copy and clearly bigger than
 * the next thing down. Layouts where everything is medium-sized score badly: that is the
 * template feel.
 */
export function punchScore(def: AnyDef, spec: AnySpec, style: SiteStyle): Score {
  const z = sizesFor(style, spec.step)
  const f = def.archetypes[spec.archetype]?.focal?.(spec.params as never, z) ?? { focal: z.h2, second: z.h3 }
  const contrast = f.focal / z.body
  const clarity = f.focal / Math.max(f.second, z.body)
  const sizeContrast = clamp01((contrast - 2.2) / 3)
  const oneFocal = clamp01((clarity - 1.25) / 1.25)
  const allMedium = contrast < 2.8 && clarity < 1.6 ? 0.45 : 0
  const punch = clamp01(0.55 * sizeContrast + 0.45 * oneFocal - allMedium)
  return { sizeContrast, oneFocal, punch, total: punch }
}

/** Soft score: punch, plus how much the theme favours the archetype. Never used to reject. */
function score(def: AnyDef, spec: AnySpec, style: SiteStyle): Score {
  const table = def.weights[style.theme] ?? {}
  const favour = (table[spec.archetype] ?? 0) / Math.max(1, ...Object.values(table))
  const own = def.score?.(spec, style)
  const p = punchScore(def, spec, style)
  const total = own ? 0.3 * favour + 0.35 * p.punch + 0.35 * own.total : 0.4 * favour + 0.6 * p.punch
  return { ...p, favour, total }
}

/** The bands a spec can really be drawn on: its own fixed band (a quiet brand moves to ink), or any the rhythm may give it. */
export function ownBands(def: AnyDef, spec: AnySpec, style: SiteStyle): readonly Band[] {
  const fixed = def.fixedBand?.(spec) ?? null
  if (!fixed) return def.checkBands
  return [fixed === 'brand' && style.palette.quiet ? 'ink' : fixed]
}

/** Static checks on every band the rhythm may give this section, plus the theme check; a rule passes only if it passes everywhere. */
export function staticChecksAll(def: AnyDef, spec: AnySpec, style: SiteStyle, given?: readonly Band[]): Check[] {
  const bands = given ?? ownBands(def, spec, style)
  const byId = new Map<string, Check>()
  for (const band of bands) {
    for (const c of def.staticChecks(spec, style, band)) {
      const prev = byId.get(c.id)
      if (!prev || (prev.ok && !c.ok)) byId.set(c.id, c)
    }
  }
  return [themeCheck(def, spec, style), ...byId.values()]
}

/** The photo sides a spec can be drawn with: its own (the hero's), both for layouts the rhythm zig-zags, else one. */
function sidesOf(def: AnyDef, spec: AnySpec): Side[] {
  const own = (spec.params as { side?: Side }).side
  if (def.type === 'hero') return [own ?? 'right']
  return def.archetypes[spec.archetype]?.sided ? ['right', 'left'] : ['right']
}

/** The worst of several measurements: a layout must pass on every side it can be drawn with. */
const worst = (ms: readonly Measurement[]): Measurement => ms.reduce((a, b) => ({
  desktop: { headlineLines: Math.max(a.desktop.headlineLines, b.desktop.headlineLines), heightPx: Math.max(a.desktop.heightPx, b.desktop.heightPx) },
  phone: {
    headlineLines: Math.max(a.phone.headlineLines, b.phone.headlineLines),
    callBottomPx: Math.max(a.phone.callBottomPx, b.phone.callBottomPx),
    overflowsWidth: a.phone.overflowsWidth || b.phone.overflowsWidth,
  },
  minTapPx: Math.min(a.minTapPx, b.minTapPx),
  coveredText: a.coveredText + b.coveredText,
}))

export function measure(def: AnyDef, spec: AnySpec, content: unknown, style: SiteStyle, measurer: Measurer): Measurement {
  return worst(sidesOf(def, spec).map(side => measurer.measure({
    spec,
    render: () => def.render(spec, style, content, { band: ownBands(def, spec, style)[0], side, motif: true }),
    estimate: () => def.estimate(spec, style, content),
  })))
}

const withStep = <S extends AnySpec>(spec: S, step: number): S => ({ ...spec, step: Math.min(step, MAX_STEP) as Step })

/** The spec at the first step (from its own) where every measured check passes, or null. */
function fitStep<S extends AnySpec>(def: AnyDef, spec: S, content: unknown, style: SiteStyle, measurer: Measurer): { spec: S; checks: Check[] } {
  let last: Check[] = []
  for (let step = spec.step; step <= MAX_STEP; step++) {
    const s = withStep(spec, step)
    last = def.measuredChecks(s, measure(def, s, content, style, measurer))
    if (last.every(c => c.ok)) return { spec: s, checks: last }
  }
  return { spec: withStep(spec, MAX_STEP), checks: last }
}

function evaluate<S extends AnySpec, C>(def: SectionDef<S, C>, seed: number, spec: S, req: OptionsRequest<C>): Candidate<S> {
  const statics = staticChecksAll(def, spec, req.style)
  // Colour and theme failures don't depend on size; skip layout for candidates already out.
  if (!statics.every(c => c.ok)) {
    return { seed, spec, checks: statics, valid: false, score: score(def, spec, req.style), features: features(def, spec) }
  }
  const fitted = fitStep(def, spec, req.content, req.style, req.measurer)
  const checks = [...statics, ...fitted.checks]
  return { seed, spec: fitted.spec, checks, valid: checks.every(c => c.ok), score: score(def, fitted.spec, req.style), features: features(def, fitted.spec) }
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
      const value = nearest * (0.55 + 0.45 * c.score.total)
      if (value > best) { best = value; bestIdx = i }
    })
    picked.push(rest.splice(bestIdx, 1)[0])
  }
  return picked
}

/**
 * The generator pipeline for any section: roll a batch, drop duplicates, reject anything
 * that breaks a hard rule (after stepping the type down to fit), then show the most
 * different survivors. Deterministic for a given batch seed, content, style and measurer.
 */
export function generateOptions<S extends AnySpec, C>(def: SectionDef<S, C>, req: OptionsRequest<C>): Options<S> {
  const count = req.count ?? BATCH_SIZE
  const rolled = new Set<string>()
  const kept = new Set<string>()
  const candidates: Candidate<S>[] = []
  if (isPresent(def, req.content)) {
    for (let i = 0; i < count; i++) {
      const seed = candidateSeed(req.batchSeed, i)
      const spec = generateSpec(def, seed, req.content, req.style)
      const key = specKey(spec)
      if (rolled.has(key)) continue
      rolled.add(key)
      const c = evaluate(def, seed, spec, req)
      // Two rolls can shrink to the same spec.
      const fitted = specKey(c.spec)
      if (kept.has(fitted)) continue
      kept.add(fitted)
      candidates.push(c)
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
  /** Switched to the same layout with smaller type, or the nearest passing option from the same batch; the customer's pick is kept as `preferred`. */
  | { status: 'repaired'; entry: Generated<S>; failed: Check[] }
  /** Nothing in the batch passes; the simplest layout is used. */
  | { status: 'fallback'; entry: Generated<S>; failed: Check[] }

/**
 * Keeps a saved section honest after its content or style changed. The customer's own
 * pick is never lost: a repair keeps it as `preferred`, and as soon as it fits again it
 * comes back. The same layout with its type stepped down is tried before any other
 * layout. Builder only; publishing never measures.
 */
export function repairSection<S extends AnySpec, C>(def: SectionDef<S, C>, saved: Generated<S>, content: C, style: SiteStyle, measurer: Measurer): FitResult<S> {
  const preferred = saved.preferred ?? saved.spec
  if (saved.preferred && fitFailures(def, saved.preferred, content, style, measurer).length === 0) {
    return { status: 'restored', entry: { seed: saved.seed, spec: saved.preferred } }
  }
  const failed = fitFailures(def, saved.spec, content, style, measurer)
  if (failed.length === 0) return { status: 'fits' }

  for (let step = preferred.step + 1; step <= MAX_STEP; step++) {
    const smaller = withStep(preferred, step)
    if (specKey(smaller) !== specKey(saved.spec) && fitFailures(def, smaller, content, style, measurer).length === 0) {
      return { status: 'repaired', entry: { seed: saved.seed, spec: smaller, preferred }, failed }
    }
  }

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
