import { mixSeeds } from '../rng'
import type { ArchetypeKey, HeroSpec, SiteStyle } from '../schema'
import { ARCHETYPE_KEYS, ARCHETYPES } from './archetypes'
import { measuredChecks, staticChecks } from './checks'
import type { Check } from './checks'
import type { HeroContent } from './content'
import { generateHeroSpec, specKey } from './generate'
import type { Measurer } from './measure'
import { renderHero } from './render'
import { distance, heroFeatures, scoreHero } from './score'
import type { Score } from './score'

export interface HeroCandidate {
  seed: number
  spec: HeroSpec
  checks: Check[]
  valid: boolean
  score: Score
  features: number[]
}

export interface HeroOptions {
  batchSeed: number
  generated: number
  /** The most different valid candidates, best first. */
  shown: HeroCandidate[]
  rejected: HeroCandidate[]
  /** Archetypes the content ruled out, with the reason. */
  gated: { archetype: ArchetypeKey; why: string }[]
}

export interface OptionsRequest {
  batchSeed: number
  content: HeroContent
  style: SiteStyle
  measurer: Measurer
  count?: number
  show?: number
}

export const BATCH_SIZE = 40
export const SHOW = 6

/** Candidate i of a batch. Exposed so tests can check determinism per candidate. */
export const candidateSeed = (batchSeed: number, i: number): number => mixSeeds(batchSeed, i)

/** Seed for the next "New options" batch. */
export const nextBatchSeed = (batchSeed: number): number => mixSeeds(batchSeed, 0x5eed)

function evaluate(seed: number, spec: HeroSpec, req: OptionsRequest): HeroCandidate {
  const statics = staticChecks(spec, req.style)
  // Colour failures are cheap to find; skip layout for candidates already out.
  const measured = statics.every(c => c.ok)
    ? measuredChecks(spec, req.measurer.measure({ spec, style: req.style, content: req.content, html: renderHero(spec, req.style, req.content) }))
    : []
  const checks = [...statics, ...measured]
  return { seed, spec, checks, valid: measured.length > 0 && checks.every(c => c.ok), score: scoreHero(spec, req.style), features: heroFeatures(spec) }
}

/** Greedy max-min selection: start from the best score, then keep adding whatever is furthest from the picks. */
export function pickDistinct(pool: readonly HeroCandidate[], show: number): HeroCandidate[] {
  const rest = [...pool].sort((a, b) => b.score.total - a.score.total || a.seed - b.seed)
  const picked: HeroCandidate[] = rest.length ? [rest.shift()!] : []
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
 * The generator pipeline: roll a batch, drop duplicates, reject anything that breaks a
 * hard rule, then show the most different survivors. Deterministic for a given
 * batch seed, content, style and measurer.
 */
export function generateHeroOptions(req: OptionsRequest): HeroOptions {
  const count = req.count ?? BATCH_SIZE
  const seen = new Set<string>()
  const candidates: HeroCandidate[] = []
  for (let i = 0; i < count; i++) {
    const seed = candidateSeed(req.batchSeed, i)
    const spec = generateHeroSpec(seed, req.content, req.style)
    const key = specKey(spec)
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push(evaluate(seed, spec, req))
  }
  const valid = candidates.filter(c => c.valid)
  return {
    batchSeed: req.batchSeed,
    generated: count,
    shown: pickDistinct(valid, req.show ?? SHOW),
    rejected: candidates.filter(c => !c.valid),
    gated: ARCHETYPE_KEYS.filter(k => !ARCHETYPES[k].gate(req.content)).map(k => ({ archetype: k, why: ARCHETYPES[k].why })),
  }
}
