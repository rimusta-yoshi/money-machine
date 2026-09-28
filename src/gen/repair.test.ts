import { describe, expect, it } from 'vitest'
import { estimateMeasurer, FALLBACK_SPEC, generateHeroOptions, heroSpecSchema, repairHero, resolveSiteStyle, specKey } from '.'
import type { GeneratedHero, HeroMeasurement, HeroSpec, Measurer } from '.'
import { distance, heroFeatures } from './hero/options'
import { RICH } from './test/fixtures'

const style = resolveSiteStyle('family', '#E8743B', 4)
const GOOD: HeroMeasurement = { desktop: { headlineLines: 2, heightPx: 600 }, phone: { headlineLines: 3, callBottomPx: 300, overflowsWidth: false }, minTapPx: 48 }
const BAD: HeroMeasurement = { ...GOOD, phone: { ...GOOD.phone, callBottomPx: 900 } }

/** Measures every spec as fitting except the ones listed. */
const failing = (...bad: HeroSpec[]): Measurer => ({
  measure: ({ spec }) => (bad.some(b => specKey(b) === specKey(spec)) ? BAD : GOOD),
})

const savedFrom = (batchSeed: number, i = 0): GeneratedHero => {
  const { shown } = generateHeroOptions({ batchSeed, content: RICH, style, measurer: estimateMeasurer })
  return { seed: batchSeed, spec: shown[i].spec }
}

describe('repairHero', () => {
  it('leaves a hero that still fits alone', () => {
    expect(repairHero(savedFrom(5), RICH, style, failing())).toEqual({ status: 'fits' })
  })

  it('switches to the nearest passing option from the same batch', () => {
    const saved = savedFrom(5, 2)
    const result = repairHero(saved, RICH, style, failing(saved.spec))
    expect(result.status).toBe('repaired')
    if (result.status !== 'repaired') return
    expect(result.entry.seed).toBe(saved.seed)
    expect(specKey(result.entry.spec)).not.toBe(specKey(saved.spec))
    expect(result.failed.map(f => f.id)).toContain('call-above-fold')
    expect(() => heroSpecSchema.parse(result.entry.spec)).not.toThrow()

    // Nothing else in the batch that passes is closer to the saved look.
    const { valid } = generateHeroOptions({ batchSeed: saved.seed, content: RICH, style, measurer: failing(saved.spec) })
    const target = heroFeatures(saved.spec)
    const best = Math.min(...valid.filter(c => specKey(c.spec) !== specKey(saved.spec)).map(c => distance(target, c.features)))
    expect(distance(target, heroFeatures(result.entry.spec))).toBe(best)
  })

  it('prefers the same archetype when one still fits', () => {
    // Find a batch with two passing options of the same archetype.
    const found = [1, 2, 3, 4, 5, 6, 7, 8].map(batchSeed => {
      const { valid } = generateHeroOptions({ batchSeed, content: RICH, style, measurer: failing() })
      const same = valid.filter(c => c.spec.archetype === valid[0].spec.archetype)
      return { batchSeed, same }
    }).find(b => b.same.length >= 2)
    expect(found).toBeDefined()
    const saved = { seed: found!.batchSeed, spec: found!.same[0].spec }
    const result = repairHero(saved, RICH, style, failing(saved.spec))
    expect(result.status === 'repaired' && result.entry.spec.archetype).toBe(saved.spec.archetype)
  })

  it('repairs a photo layout whose photo was removed', () => {
    const saved: GeneratedHero = { seed: 5, spec: { v: 1, section: 'hero', archetype: 'overlay', params: { anchor: 'center', scrim: 0.65 } } }
    const result = repairHero(saved, { ...RICH, photo: null }, style, failing())
    expect(result.status).toBe('repaired')
    if (result.status !== 'repaired') return
    expect(result.failed[0].id).toBe('content-gate')
    expect(['stacked', 'typeled', 'proof', 'contact']).toContain(result.entry.spec.archetype)
  })

  it('falls back to the safe layout when nothing in the batch fits', () => {
    const nothingFits: Measurer = { measure: () => BAD }
    const result = repairHero(savedFrom(5), RICH, style, nothingFits)
    expect(result).toMatchObject({ status: 'fallback', entry: { seed: 5, spec: FALLBACK_SPEC } })
  })

  it('is deterministic', () => {
    const saved = savedFrom(5, 1)
    expect(repairHero(saved, RICH, style, failing(saved.spec))).toEqual(repairHero(saved, RICH, style, failing(saved.spec)))
  })

  it('remembers the customer’s pick and brings it back once it fits again', () => {
    const saved = savedFrom(5, 2)
    const repaired = repairHero(saved, RICH, style, failing(saved.spec))
    expect(repaired.status).toBe('repaired')
    if (repaired.status !== 'repaired') return
    expect(repaired.entry.preferred).toEqual(saved.spec)

    // A second repair keeps the original pick, not the stand-in.
    const again = repairHero(repaired.entry, RICH, style, failing(saved.spec, repaired.entry.spec))
    expect(again.status === 'repaired' && again.entry.preferred).toEqual(saved.spec)

    // Once it fits, it's restored and the memory is cleared.
    const restored = repairHero(repaired.entry, RICH, style, failing())
    expect(restored).toEqual({ status: 'restored', entry: { seed: saved.seed, spec: saved.spec } })
  })

  it('keeps the stand-in while the customer’s pick still doesn’t fit', () => {
    const saved = savedFrom(5, 2)
    const repaired = repairHero(saved, RICH, style, failing(saved.spec))
    if (repaired.status !== 'repaired') throw new Error('expected a repair')
    expect(repairHero(repaired.entry, RICH, style, failing(saved.spec))).toEqual({ status: 'fits' })
  })
})
