import { describe, expect, it } from 'vitest'
import {
  ARCHETYPE_KEYS, allowedArchetypes, candidateSeed, estimateMeasurer, generateHeroOptions, generateHeroSpec,
  heroSpecSchema, mulberry32, nextBatchSeed, renderSection, resolveSiteStyle, siteStyleSchema, specKey, staticChecks,
  THEME_KEYS,
} from '.'
import type { HeroContent, HeroMeasurement, Measurer } from '.'
import { contrastRatio } from './color'
import { BARE, BRANDS, ONE_OF_EACH, RICH } from './test/fixtures'

const style = resolveSiteStyle('family', '#E8743B', 4)

describe('mulberry32', () => {
  it('gives the same sequence for the same seed and a different one otherwise', () => {
    const run = (seed: number) => { const r = mulberry32(seed); return [r(), r(), r()] }
    expect(run(48213)).toEqual(run(48213))
    expect(run(48213)).not.toEqual(run(48214))
    run(1).forEach(x => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1) })
  })
})

describe('resolveSiteStyle', () => {
  it('is deterministic and produces a valid, storable style', () => {
    const a = resolveSiteStyle('professional', '#1E88E5', 99)
    expect(resolveSiteStyle('professional', '#1E88E5', 99)).toEqual(a)
    expect(siteStyleSchema.parse(JSON.parse(JSON.stringify(a)))).toEqual(a)
  })

  it.each(THEME_KEYS.flatMap(t => BRANDS.map(b => [t, b] as const)))('%s + %s: every colour pair it hands out meets AA', (theme, brand) => {
    for (const seed of [1, 2, 3]) {
      const p = resolveSiteStyle(theme, brand, seed).palette
      expect(contrastRatio(p.brandFill, p.brandInk)).toBeGreaterThanOrEqual(4.5)
      for (const bg of [p.ground, p.surface]) {
        expect(contrastRatio(p.brandText, bg)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(p.ink, bg)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(p.muted, bg)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('refuses a brand colour that is not a hex colour', () => {
    expect(() => resolveSiteStyle('family', 'red;background:url(x)', 1)).toThrow(/hex colour/)
  })

  it('never makes a button shorter than a tap target', () => {
    for (const theme of THEME_KEYS) for (let seed = 0; seed < 50; seed++) {
      expect(resolveSiteStyle(theme, '#1E88E5', seed).buttonHeight).toBeGreaterThanOrEqual(44)
    }
  })
})

describe('generateHeroSpec', () => {
  it('gives an identical spec for the same seed and content', () => {
    for (let i = 0; i < 40; i++) {
      const seed = candidateSeed(7, i)
      expect(generateHeroSpec(seed, RICH, style)).toEqual(generateHeroSpec(seed, { ...RICH }, style))
    }
  })

  it('only shows specs that survive a JSON round trip through the stored schema', () => {
    for (const batchSeed of [1, 2, 3]) {
      const { shown } = generateHeroOptions({ batchSeed, content: RICH, style, measurer: estimateMeasurer })
      for (const { spec } of shown) expect(heroSpecSchema.parse(JSON.parse(JSON.stringify(spec)))).toEqual(spec)
    }
  })

  it('uses every archetype when the content allows all of them', () => {
    const seen = new Set(Array.from({ length: 300 }, (_, i) => generateHeroSpec(candidateSeed(1, i), RICH, style).archetype))
    expect([...seen].sort()).toEqual([...ARCHETYPE_KEYS].sort())
  })

  const archetypesFor = (c: HeroContent) =>
    new Set(Array.from({ length: 300 }, (_, i) => generateHeroSpec(candidateSeed(2, i), c, style).archetype))

  it('never uses a photo archetype without a hero photo', () => {
    const used = archetypesFor({ ...RICH, photo: null })
    for (const a of ['overlay', 'split', 'card', 'offset'] as const) expect(used.has(a), a).toBe(false)
    expect(allowedArchetypes({ ...RICH, photo: null })).not.toContain('overlay')
  })

  it('never uses Proof-first with fewer than 3 reviews', () => {
    expect(archetypesFor({ ...RICH, reviews: RICH.reviews.slice(0, 2) }).has('proof')).toBe(false)
    expect(allowedArchetypes(RICH)).toContain('proof')
  })

  it('never uses the contact panel without somewhere for enquiries to go', () => {
    expect(archetypesFor({ ...RICH, quoteForm: false }).has('contact')).toBe(false)
  })

  it('keeps photo-free options photo-free inside Stacked too', () => {
    for (let i = 0; i < 100; i++) {
      const spec = generateHeroSpec(candidateSeed(4, i), BARE, style)
      if (spec.archetype === 'stacked') expect(spec.params.image).toBe('none')
    }
  })
})

describe('generateHeroOptions', () => {
  const cases = THEME_KEYS.flatMap(theme => [BARE, RICH].flatMap(content => BRANDS.slice(0, 4).map(brand => ({ theme, content, brand }))))

  it.each(cases)('$theme / $brand: every shown candidate passes every hard check', ({ theme, content, brand }) => {
    const s = resolveSiteStyle(theme, brand, 11)
    const { shown } = generateHeroOptions({ batchSeed: 5, content, style: s, measurer: estimateMeasurer })
    expect(shown.length).toBeLessThanOrEqual(6)
    for (const c of shown) {
      expect(c.valid).toBe(true)
      expect(c.checks.filter(x => !x.ok)).toEqual([])
      // Measured checks ran too, not just the colour ones.
      expect(c.checks.map(x => x.id)).toEqual(expect.arrayContaining(['tap-targets', 'headline-fits', 'fits-section', 'call-above-fold']))
    }
  })

  it('shows six different options for a typical site', () => {
    const { shown } = generateHeroOptions({ batchSeed: 5, content: RICH, style, measurer: estimateMeasurer })
    expect(shown).toHaveLength(6)
    expect(new Set(shown.map(c => specKey(c.spec))).size).toBe(6)
    expect(new Set(shown.map(c => c.spec.archetype)).size).toBeGreaterThanOrEqual(4)
  })

  it('shows the same options for the same batch seed, and new ones after a re-roll', () => {
    const run = (batchSeed: number) =>
      generateHeroOptions({ batchSeed, content: RICH, style, measurer: estimateMeasurer }).shown.map(c => specKey(c.spec))
    expect(run(5)).toEqual(run(5))
    expect(run(nextBatchSeed(5))).not.toEqual(run(5))
  })

  const fake = (m: Partial<HeroMeasurement>): Measurer => ({
    measure: () => ({ desktop: { headlineLines: 2, heightPx: 640 }, phone: { headlineLines: 3, callBottomPx: 300, overflowsWidth: false }, minTapPx: 48, ...m }),
  })

  it.each([
    ['call-above-fold', { phone: { headlineLines: 3, callBottomPx: 700, overflowsWidth: false } }],
    ['fits-phone-width', { phone: { headlineLines: 3, callBottomPx: 300, overflowsWidth: true } }],
    ['headline-fits', { desktop: { headlineLines: 4, heightPx: 640 } }],
    ['fits-section', { desktop: { headlineLines: 2, heightPx: 720 } }],
    ['tap-targets', { minTapPx: 30 }],
  ] as const)('rejects every candidate that fails %s', (id, m) => {
    const o = generateHeroOptions({ batchSeed: 5, content: BARE, style, measurer: fake(m) })
    expect(o.shown).toEqual([])
    expect(o.rejected.every(c => c.checks.some(x => x.id === id && !x.ok))).toBe(true)
  })

  it('reports which archetypes the content ruled out', () => {
    const o = generateHeroOptions({ batchSeed: 5, content: BARE, style, measurer: estimateMeasurer })
    expect(o.gated.map(g => g.archetype).sort()).toEqual(['card', 'contact', 'offset', 'overlay', 'proof', 'split'])
  })
})

describe('staticChecks', () => {
  it('rejects headline text that fails AA on a brand band', () => {
    const mid = resolveSiteStyle('professional', '#777777', 1)
    // Force a palette whose label colour is too weak on the fill.
    const weak = { ...mid, palette: { ...mid.palette, brandFill: '#888888', brandInk: '#FFFFFF' } }
    const spec = ONE_OF_EACH.find(s => s.archetype === 'stacked')!
    expect(staticChecks(spec, weak).find(c => c.id === 'headline-contrast')?.ok).toBe(false)
  })

  it('treats overlay text as sitting on a white photo under the scrim', () => {
    const head = (scrim: number) =>
      staticChecks({ v: 1, section: 'hero', archetype: 'overlay', params: { anchor: 'center', scrim } }, style)
        .find(c => c.id === 'headline-contrast')!
    // White text over a 50% scrim on a white photo is only about 4:1.
    expect(head(0.5).ok).toBe(false)
    expect(head(0.58).ok).toBe(true)
  })
})

describe('renderSection', () => {
  it.each(ONE_OF_EACH)('$archetype renders one h1, a tel: link and a labelled section', spec => {
    const html = renderSection(spec, style, RICH)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('href="tel:01134960000"')
    expect(html).toMatch(/^<section [^>]*aria-labelledby="sb-hero-title"/)
  })

  it('escapes content and refuses unsafe URLs', () => {
    const evil: HeroContent = {
      ...RICH,
      headline: '<img src=x onerror=alert(1)>',
      photo: { url: 'javascript:alert(1)', alt: '" onload="alert(1)' },
    }
    const html = renderSection(ONE_OF_EACH[0], style, evil)
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('" onload="')
  })

  it('shows a rating only when the record has one', () => {
    const noRating = renderSection(ONE_OF_EACH[1], style, { ...RICH, rating: null })
    expect(noRating).not.toContain('sb-stars')
    expect(noRating).not.toMatch(/reviews/)
    const withRating = renderSection(ONE_OF_EACH[1], style, RICH)
    expect(withRating).toContain('aria-label="Rated 4.8 out of 5"')
    expect(withRating).toContain('4.8 from 27 reviews')
  })

  it('falls back rather than render a saved spec that no longer passes the colour checks', () => {
    const weak = { ...style, palette: { ...style.palette, brandFill: '#888888', brandInk: '#FFFFFF' } }
    const brandBand = ONE_OF_EACH.find(s => s.archetype === 'stacked')!
    expect(renderSection(brandBand, weak, RICH)).toContain('sb-tone--ground')
  })

  it('falls back to a photo-free layout if a saved photo archetype loses its photo', () => {
    const html = renderSection(ONE_OF_EACH[1], style, { ...RICH, photo: null })
    expect(html).toContain('sb-hero--stacked')
    expect(html).not.toContain('<img')
  })

  it('is a pure function of spec, style and content', () => {
    expect(renderSection(ONE_OF_EACH[6], style, RICH)).toBe(renderSection(ONE_OF_EACH[6], style, RICH))
  })
})
