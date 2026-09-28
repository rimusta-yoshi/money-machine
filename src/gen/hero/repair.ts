import type { GeneratedHero, HeroSpec, SiteStyle } from '../schema'
import { ARCHETYPES, FALLBACK_SPEC } from './archetypes'
import { measuredChecks, staticChecks } from './checks'
import type { Check } from './checks'
import type { HeroContent } from './content'
import { specKey } from './generate'
import type { Measurer } from './measure'
import { generateHeroOptions } from './options'
import { renderHero } from './render'
import { distance, heroFeatures } from './score'

export type FitResult =
  | { status: 'fits' }
  /** Switched to the nearest passing option from the saved spec's own batch. */
  | { status: 'repaired'; hero: GeneratedHero; failed: Check[] }
  /** Nothing in the batch passes any more; the simplest layout is used, even if it may not fully fit. */
  | { status: 'fallback'; hero: GeneratedHero; failed: Check[] }

/** The rules a saved spec breaks with today's content and style (empty = still fits). */
export function fitFailures(spec: HeroSpec, content: HeroContent, style: SiteStyle, measurer: Measurer): Check[] {
  const archetype = ARCHETYPES[spec.archetype]
  if (!archetype.gate(content)) {
    return [{ id: 'content-gate', label: 'Needs content that’s missing', ok: false, detail: archetype.why }]
  }
  const statics = staticChecks(spec, style)
  if (statics.some(c => !c.ok)) return statics.filter(c => !c.ok)
  const m = measurer.measure({ spec, style, content, html: renderHero(spec, style, content) })
  return measuredChecks(spec, m).filter(c => !c.ok)
}

/**
 * Re-checks a saved hero after its content or style changed. If it no longer fits, picks
 * the passing candidate from the same batch that looks most like it (nearest in feature
 * space), so the customer's choice changes as little as possible. Builder only: publishing
 * never measures, it renders the saved spec.
 */
export function repairHero(saved: GeneratedHero, content: HeroContent, style: SiteStyle, measurer: Measurer): FitResult {
  const failed = fitFailures(saved.spec, content, style, measurer)
  if (failed.length === 0) return { status: 'fits' }

  const { valid } = generateHeroOptions({ batchSeed: saved.seed, content, style, measurer })
  const target = heroFeatures(saved.spec)
  const nearest = [...valid]
    .filter(c => specKey(c.spec) !== specKey(saved.spec))
    .sort((a, b) => distance(target, a.features) - distance(target, b.features) || b.score.total - a.score.total || a.seed - b.seed)[0]
  if (nearest) return { status: 'repaired', hero: { seed: saved.seed, spec: nearest.spec }, failed }
  return { status: 'fallback', hero: { seed: saved.seed, spec: FALLBACK_SPEC }, failed }
}
