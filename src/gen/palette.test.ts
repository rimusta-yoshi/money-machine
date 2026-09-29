import { describe, expect, it } from 'vitest'
import { AA, contrastRatio } from './color'
import { estimateMeasurer, generateOptions, resolvePage, resolveSiteStyle, SECTION_KEYS, SECTIONS, THEME_KEYS, THEMES, viewOf } from '.'
import { hueOf } from './roles'
import { BRANDS, RICH_PAGE } from './test/fixtures'

/** Every theme's colour logic, over every ground it can roll and a wide spread of brand colours. */
const MORE_BRANDS = [...BRANDS, '#16A34A', '#D97706', '#2563EB', '#7C3AED', '#DC2626', '#15803D', '#1E4D3A', '#0B6E6D', '#FFD400', '#F5F5DC']

describe.each(THEME_KEYS)('%s palettes', theme => {
  const t = THEMES[theme]
  const cases = t.grounds.flatMap(n => MORE_BRANDS.map(brand => ({ n, brand, p: t.palette(brand, n) })))

  it('keep ink and muted text readable on the ground, the surface and every tile colour', () => {
    for (const { p } of cases) for (const bg of [p.ground, p.surface, ...p.tints]) {
      expect(contrastRatio(p.ink, bg)).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(p.muted, bg)).toBeGreaterThanOrEqual(AA)
    }
  })

  it('make a brand fill whose label reads, and brand text that reads everywhere it is used', () => {
    for (const { p, brand } of cases) {
      expect(contrastRatio(p.brandFill, p.brandInk), brand).toBeGreaterThanOrEqual(AA)
      for (const bg of [p.ground, p.surface, ...p.tints]) expect(contrastRatio(p.brandText, bg), `${brand} on ${bg}`).toBeGreaterThanOrEqual(AA)
      expect(contrastRatio(p.ground, p.ink)).toBeGreaterThanOrEqual(AA)
    }
  })

  it('resolve to the same style for the same seed, and roll differently on a new one', () => {
    expect(resolveSiteStyle(theme, '#1E88E5', 3)).toEqual(resolveSiteStyle(theme, '#1E88E5', 3))
    const rolls = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(resolveSiteStyle(theme, '#1E88E5', i))))
    expect(rolls.size).toBeGreaterThan(3)
  })
})

describe('theme colour logic', () => {
  it('Workwear labels the accent with its own near-black whenever that reads', () => {
    for (const brand of MORE_BRANDS) {
      const p = resolveSiteStyle('workwear', brand, 1).palette
      if (contrastRatio(p.ground, p.brandFill) >= AA) expect(p.brandInk).toBe(p.ground)
    }
  })

  it('Craft Heritage labels the brand with its paper colour whenever that reads', () => {
    for (const brand of MORE_BRANDS) {
      const p = resolveSiteStyle('craft-heritage', brand, 1).palette
      if (contrastRatio(p.ground, p.brandFill) >= AA) expect(p.brandInk).toBe(p.ground)
    }
  })

  it('rejects a brand colour that isn’t a hex colour', () => {
    expect(() => resolveSiteStyle('clean-pro', 'red', 1)).toThrow(/hex/)
  })
})

/** Colours customers really pick that are hard to read with: pale, grey, neon, nearly black, nearly white. */
const AWKWARD = { 'pale yellow': '#FFF59D', 'mid grey': '#808080', 'neon green': '#39FF14', 'near-black': '#0D0D0D', 'near-white': '#F8F8F6', 'hi-vis yellow': '#FFE500', 'baby blue': '#A7D8F5' }

describe.each(THEME_KEYS)('%s colour roles', theme => {
  const t = THEMES[theme]
  const cases = t.grounds.flatMap(n => Object.entries(AWKWARD).map(([name, brand]) => ({ name, brand, n, p: t.palette(brand, n) })))

  it('always uses the exact colour for fills and large shapes', () => {
    for (const { brand, p } of cases) {
      expect(p.brand).toBe(brand.toUpperCase())
      expect(p.brandFill).toBe(brand.toUpperCase())
    }
  })

  it('labels buttons black or white (as the theme draws them), whichever reads at 4.5:1', () => {
    for (const { name, p } of cases) {
      expect(contrastRatio(p.brandFill, p.brandInk), name).toBeGreaterThanOrEqual(AA)
      const lum = contrastRatio(p.brandInk, '#000000')
      expect(lum < 1.4 || lum > 17, `${name}: ${p.brandInk} is a black or a white`).toBe(true)
    }
  })

  it('gives a button a same-hue edge whenever its fill stands out less than 3:1', () => {
    for (const { name, p } of cases) for (const bg of [p.ground, p.surface, ...p.tints]) {
      expect(Math.max(contrastRatio(p.brandFill, bg), contrastRatio(p.brandEdge, bg)), `${name} on ${bg}`).toBeGreaterThanOrEqual(3)
      if (contrastRatio(p.brandFill, bg) >= 3 && bg === p.ground && contrastRatio(p.brandFill, p.surface) >= 3) expect(p.brandEdge).toBe(p.brandFill)
      sameHue(p.brandEdge, p.brandFill, name)
    }
  })

  it('tunes brand text to a shade of the same hue that reads at 4.5:1 on every background', () => {
    for (const { name, p } of cases) {
      for (const bg of [p.ground, p.surface, ...p.tints]) expect(contrastRatio(p.brandText, bg), `${name} text on ${bg}`).toBeGreaterThanOrEqual(AA)
      sameHue(p.brandText, p.brandFill, name)
    }
  })

  it('keeps a quiet colour (under 1.5:1 on the ground) to contrasting bands and tints', () => {
    for (const { name, p } of cases) {
      expect(p.quiet, name).toBe(contrastRatio(p.brandFill, p.ground) < 1.5)
      if (p.quiet) expect(p.accent, name).not.toBe(p.brandFill)
      else expect(p.accent, name).toBe(p.brandFill)
    }
    for (const brand of Object.values(AWKWARD)) {
      const style = resolveSiteStyle(theme, brand, 2)
      if (!style.palette.quiet) continue
      const page = resolvePage({ order: SECTION_KEYS, saved: {}, content: RICH_PAGE, style, styleSeed: 2 })
      expect(page.map(s => s.rhythm.band), brand).not.toContain('brand')
    }
  })

  it('says when it tuned anything', () => {
    for (const { name, p } of cases) {
      const changed = p.quiet || p.brandText !== p.brandFill || p.brandEdge !== p.brandFill
      expect(p.tuned, name).toBe(changed)
    }
  })

  it('still passes every hard check with these colours', () => {
    for (const brand of Object.values(AWKWARD)) {
      const style = resolveSiteStyle(theme, brand, 4)
      for (const type of SECTION_KEYS) {
        const { shown } = generateOptions(SECTIONS[type], { batchSeed: 6, content: viewOf(type, RICH_PAGE), style, measurer: estimateMeasurer })
        expect(shown.length, `${brand} ${type}`).toBeGreaterThan(0)
        for (const c of shown) expect(c.checks.filter(x => !x.ok), `${brand} ${type}`).toEqual([])
      }
    }
  })
})

/** Same hue within a few degrees (greys and near-black/white have no hue to keep). */
function sameHue(a: string, b: string, name: string) {
  const [ha, hb] = [hueOf(a), hueOf(b)]
  if (ha === null || hb === null) return
  const d = Math.abs(ha - hb)
  expect(Math.min(d, 360 - d), `${name}: ${a} vs ${b}`).toBeLessThanOrEqual(8)
}
