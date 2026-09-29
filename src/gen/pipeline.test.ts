import { describe, expect, it } from 'vitest'
import { distance, generateOptions, punchScore, repairSection, specKey } from './core/pipeline'
import { features } from './core/pipeline'
import { estimateMeasurer, resolveSiteStyle, sectionSchemas, SECTIONS, viewOf } from '.'
import type { AnySpec, Generated, Measurement, Measurer, SectionKey } from '.'
import { FITS, RICH_PAGE } from './test/fixtures'

const style = resolveSiteStyle('friendly-local', '#E8743B', 4)
const TOO_TALL: Measurement = { ...FITS, phone: { ...FITS.phone, callBottomPx: 900 } }
const view = (t: SectionKey) => viewOf(t, RICH_PAGE)

/** Measures every spec as fitting except the listed layouts, at any size. */
const failing = (bad: AnySpec[] = []): Measurer => ({
  measure: ({ spec }) => (bad.some(b => b.archetype === spec.archetype && JSON.stringify(b.params) === JSON.stringify(spec.params)) ? TOO_TALL : FITS),
})
/** Fits only from the given step down. */
const fitsFromStep = (step: number): Measurer => ({ measure: ({ spec }) => (spec.step >= step ? FITS : TOO_TALL) })

const savedFrom = (batchSeed: number, i = 0): Generated => {
  const { shown } = generateOptions(SECTIONS.hero, { batchSeed, content: view('hero'), style, measurer: estimateMeasurer })
  return { seed: batchSeed, spec: shown[i].spec }
}

describe('shrinking to fit', () => {
  it('steps a candidate down its type preset before rejecting it', () => {
    const { shown, rejected } = generateOptions(SECTIONS.hero, { batchSeed: 3, content: view('hero'), style, measurer: fitsFromStep(2) })
    expect(shown.length).toBeGreaterThan(0)
    for (const c of shown) expect(c.spec.step).toBe(2)
    expect(rejected.filter(c => c.checks.some(x => x.id === 'call-above-fold' && !x.ok))).toEqual([])
  })

  it('rejects a candidate that doesn’t fit even at its smallest step', () => {
    const { shown } = generateOptions(SECTIONS.hero, { batchSeed: 3, content: view('hero'), style, measurer: { measure: () => TOO_TALL } })
    expect(shown).toEqual([])
  })

  it('stores the step, so a saved section keeps its size', () => {
    const { shown } = generateOptions(SECTIONS.hero, { batchSeed: 3, content: view('hero'), style, measurer: fitsFromStep(1) })
    for (const c of shown) expect(sectionSchemas.hero.parse(JSON.parse(JSON.stringify(c.spec))).step).toBe(1)
  })
})

describe('punch score', () => {
  const heroSpec = (step: 0 | 1 | 2): AnySpec => ({ ...SECTIONS.hero.fallback, step })

  it('rewards bigger type over the same layout set smaller', () => {
    expect(punchScore(SECTIONS.hero, heroSpec(0), style).total).toBeGreaterThanOrEqual(punchScore(SECTIONS.hero, heroSpec(2), style).total)
  })

  it('penalises layouts where everything is medium-sized', () => {
    const def = { ...SECTIONS.services, archetypes: { ...SECTIONS.services.archetypes, list: { ...SECTIONS.services.archetypes.list, focal: () => ({ focal: 30, second: 26 }) } } }
    const bold = punchScore(SECTIONS.services, SECTIONS.services.fallback, style).total
    expect(punchScore(def, SECTIONS.services.fallback, style).total).toBeLessThan(bold)
    expect(punchScore(def, SECTIONS.services.fallback, style).total).toBeLessThan(0.1)
  })

  it('ranks shown options by score first', () => {
    const { shown } = generateOptions(SECTIONS.services, { batchSeed: 8, content: view('services'), style, measurer: estimateMeasurer })
    expect(shown[0].score.total).toBe(Math.max(...shown.map(c => c.score.total)))
  })
})

describe('repairSection', () => {
  it('leaves a section that still fits alone', () => {
    expect(repairSection(SECTIONS.hero, savedFrom(5), view('hero'), style, failing())).toEqual({ status: 'fits' })
  })

  it('first tries the same layout with smaller type', () => {
    const saved = savedFrom(5, 1)
    const onlySmaller: Measurer = { measure: ({ spec }) => (specKey(spec) === specKey(saved.spec) ? TOO_TALL : spec.archetype === saved.spec.archetype ? FITS : TOO_TALL) }
    const result = repairSection(SECTIONS.hero, saved, view('hero'), style, onlySmaller)
    expect(result.status).toBe('repaired')
    if (result.status !== 'repaired') return
    expect(result.entry.spec).toEqual({ ...saved.spec, step: saved.spec.step + 1 })
    expect(result.entry.preferred).toEqual(saved.spec)
  })

  it('then switches to the nearest passing option from the same batch', () => {
    const saved = savedFrom(5, 2)
    const layoutFails: Measurer = { measure: ({ spec }) => (spec.archetype === saved.spec.archetype && JSON.stringify(spec.params) === JSON.stringify(saved.spec.params) ? TOO_TALL : FITS) }
    const result = repairSection(SECTIONS.hero, saved, view('hero'), style, layoutFails)
    expect(result.status).toBe('repaired')
    if (result.status !== 'repaired') return
    expect(result.entry.seed).toBe(saved.seed)
    expect(result.failed.map(f => f.id)).toContain('call-above-fold')
    const { valid } = generateOptions(SECTIONS.hero, { batchSeed: saved.seed, content: view('hero'), style, measurer: layoutFails })
    const target = features(SECTIONS.hero, saved.spec)
    const best = Math.min(...valid.filter(c => specKey(c.spec) !== specKey(saved.spec)).map(c => distance(target, c.features)))
    expect(distance(target, features(SECTIONS.hero, result.entry.spec))).toBe(best)
  })

  it('repairs a layout the theme no longer allows (after a theme switch)', () => {
    const workwear = resolveSiteStyle('workwear', '#FFD400', 4)
    const { shown } = generateOptions(SECTIONS.hero, { batchSeed: 5, content: view('hero'), style: workwear, measurer: estimateMeasurer })
    const bigphone = shown.find(c => c.spec.archetype === 'bigphone') ?? shown[0]
    const result = repairSection(SECTIONS.hero, { seed: 5, spec: bigphone.spec }, view('hero'), style, failing())
    expect(result.status).toBe('repaired')
    if (result.status !== 'repaired') return
    expect(result.failed.map(f => f.id)).toContain('theme-fit')
    expect(result.entry.preferred).toEqual(bigphone.spec)
  })

  it('falls back to the safe layout when nothing in the batch fits', () => {
    const result = repairSection(SECTIONS.hero, savedFrom(5), view('hero'), style, { measure: () => TOO_TALL })
    expect(result).toMatchObject({ status: 'fallback', entry: { seed: 5, spec: SECTIONS.hero.fallback } })
  })

  it('remembers the customer’s pick and brings it back once it fits again', () => {
    const saved = savedFrom(5, 2)
    const layoutFails: Measurer = { measure: ({ spec }) => (spec.archetype === saved.spec.archetype ? TOO_TALL : FITS) }
    const repaired = repairSection(SECTIONS.hero, saved, view('hero'), style, layoutFails)
    if (repaired.status !== 'repaired') throw new Error('expected a repair')
    expect(repaired.entry.preferred).toEqual(saved.spec)
    const restored = repairSection(SECTIONS.hero, repaired.entry, view('hero'), style, failing())
    expect(restored).toEqual({ status: 'restored', entry: { seed: saved.seed, spec: saved.spec } })
  })

  it('is deterministic', () => {
    const saved = savedFrom(5, 1)
    const m = failing([saved.spec])
    expect(repairSection(SECTIONS.hero, saved, view('hero'), style, m)).toEqual(repairSection(SECTIONS.hero, saved, view('hero'), style, m))
  })
})

describe('overlapping decorations', () => {
  it('rejects any option whose sticker, card or stripe covers text', () => {
    const covered: Measurer = { measure: () => ({ ...FITS, coveredText: 1 }) }
    const { shown, rejected } = generateOptions(SECTIONS.hero, { batchSeed: 2, content: view('hero'), style, measurer: covered })
    expect(shown).toEqual([])
    expect(rejected.every(c => c.checks.some(x => x.id === 'no-covered-text' && !x.ok) || c.checks.some(x => !x.ok))).toBe(true)
  })
})
