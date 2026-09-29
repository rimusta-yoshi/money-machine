import { describe, expect, it } from 'vitest'
import { allowed, candidateSeed, generateOptions, generateSpec, isPresent, specKey } from './core/pipeline'
import { outsideTheme } from './core/punch'
import {
  estimateMeasurer, heroView, presentSections, renderPageSection, resolvePage, resolveSiteStyle, sectionSchemas, SECTION_KEYS, SECTIONS,
  solveRhythm, THEME_KEYS, THEMES, viewOf,
} from '.'
import type { AnySpec, PageContent, ResolvedSection, SectionKey, ThemeKey } from '.'
import { BARE_PAGE, BRANDS, RICH_PAGE } from './test/fixtures'

const view = (t: SectionKey, c: PageContent = RICH_PAGE) => viewOf(t, c) as never
const themeUses = (type: SectionKey, theme: ThemeKey) =>
  Object.entries(SECTIONS[type].weights[theme] ?? {}).filter(([, w]) => w > 0).map(([k]) => k).sort()

describe.each(SECTION_KEYS)('%s', type => {
  const def = SECTIONS[type]

  it('gives an identical spec for the same seed, content and style', () => {
    for (const theme of THEME_KEYS) {
      const style = resolveSiteStyle(theme, '#1E88E5', 5)
      for (let i = 0; i < 20; i++) {
        const seed = candidateSeed(9, i)
        expect(generateSpec(def, seed, view(type), style)).toEqual(generateSpec(def, seed, view(type, { ...RICH_PAGE }), style))
      }
    }
  })

  it.each(THEME_KEYS)('uses every layout %s allows that the content allows, and nothing else', theme => {
    const style = resolveSiteStyle(theme, '#1E88E5', 5)
    const seen = new Set(Array.from({ length: 400 }, (_, i) => generateSpec(def, candidateSeed(3, i), view(type), style).archetype))
    const gated = allowed(def, view(type))
    expect([...seen].sort()).toEqual(themeUses(type, theme).filter(k => gated.includes(k)))
  })

  it.each(THEME_KEYS.flatMap(t => BRANDS.slice(0, 4).map(b => [t, b] as const)))('%s / %s: shows distinct options that all pass every hard check', (theme, brand) => {
    const style = resolveSiteStyle(theme, brand, 7)
    const { shown } = generateOptions(def, { batchSeed: 4, content: view(type), style, measurer: estimateMeasurer })
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.length).toBeLessThanOrEqual(6)
    expect(new Set(shown.map(c => specKey(c.spec))).size).toBe(shown.length)
    for (const c of shown) {
      expect(c.checks.filter(x => !x.ok)).toEqual([])
      expect(c.checks.map(x => x.id)).toEqual(expect.arrayContaining(['theme-fit', 'tap-targets', 'fits-phone-width', 'no-covered-text']))
      expect(outsideTheme(def, c.spec, style)).toBeNull()
    }
  })

  it('only shows specs that survive a JSON round trip through the stored schema', () => {
    const style = resolveSiteStyle('friendly-local', '#0B6E6D', 2)
    const { shown } = generateOptions(def, { batchSeed: 2, content: view(type), style, measurer: estimateMeasurer })
    const schema = sectionSchemas[type]
    for (const { spec } of shown) expect(schema.parse(JSON.parse(JSON.stringify(spec)))).toEqual(spec)
  })

  it('has a fallback that is valid, fits every theme, and is allowed whenever the section is present', () => {
    expect(() => sectionSchemas[type].parse(def.fallback)).not.toThrow()
    for (const theme of THEME_KEYS) expect(outsideTheme(def, def.fallback, resolveSiteStyle(theme, '#1E88E5', 1))).toBeNull()
    for (const c of [RICH_PAGE, BARE_PAGE]) {
      if (isPresent(def, view(type, c))) expect(def.archetypes[def.fallback.archetype].gate(view(type, c))).toBe(true)
    }
  })
})

describe('themes', () => {
  it('give every section at least three layouts in every theme', () => {
    for (const type of SECTION_KEYS) for (const theme of THEME_KEYS) expect(themeUses(type, theme).length, `${type}/${theme}`).toBeGreaterThanOrEqual(3)
  })

  it('keep theme-only layouts inside their own theme', () => {
    const only: [SectionKey, string, ThemeKey][] = [
      ['hero', 'bigphone', 'workwear'], ['hero', 'floatcard', 'clean-pro'], ['hero', 'editorial', 'craft-heritage'], ['hero', 'sticker', 'friendly-local'],
      ['services', 'pricelist', 'craft-heritage'], ['services', 'poster', 'workwear'], ['services', 'bento', 'clean-pro'],
    ]
    for (const [type, archetype, home] of only) {
      for (const theme of THEME_KEYS) expect(themeUses(type, theme).includes(archetype), `${type}/${archetype} in ${theme}`).toBe(theme === home)
    }
  })

  it('rotate things only in Friendly Local, and only by 3–6 degrees', () => {
    for (const theme of THEME_KEYS) {
      const style = resolveSiteStyle(theme, '#1E88E5', 3)
      for (const type of SECTION_KEYS) for (let i = 0; i < 150; i++) {
        const p = generateSpec(SECTIONS[type], candidateSeed(5, i), view(type), style).params as { rot?: number }
        if (p.rot === undefined) continue
        const a = Math.abs(p.rot)
        if (theme === 'friendly-local') expect(a).toBeGreaterThanOrEqual(3)
        else expect(a).toBe(0)
        expect(a).toBeLessThanOrEqual(6)
      }
    }
  })

  it('reject a stored spec that strays outside its theme', () => {
    const style = resolveSiteStyle('craft-heritage', '#1E4D3A', 1)
    const bigphone: AnySpec = { v: 2, section: 'hero', archetype: 'bigphone', step: 0, params: { photo: false, side: 'left', crop: '1:1', motif: 'none', at: 'br', tone: 'ground', em: false } }
    expect(outsideTheme(SECTIONS.hero, bigphone, style)).toMatch(/doesn’t use this layout/)
    const rotated: AnySpec = { ...SECTIONS.hero.fallback, archetype: 'stacked', params: { align: 'center', image: 'none', tone: 'ground', em: false } }
    expect(outsideTheme(SECTIONS.hero, rotated, resolveSiteStyle('workwear', '#FFD400', 1))).toMatch(/align/)
  })
})

describe('content rules', () => {
  const allowedFor = (t: SectionKey, c: PageContent) => allowed(SECTIONS[t], viewOf(t, c))

  it('leaves out sections whose content is missing, never inventing it', () => {
    expect(presentSections(SECTION_KEYS, BARE_PAGE)).toEqual(['hero', 'services', 'about', 'why_us', 'contact', 'footer'])
    expect(presentSections(SECTION_KEYS, RICH_PAGE)).toEqual([...SECTION_KEYS])
  })

  it('never uses photo-led layouts without real photos', () => {
    const noPhotos = { ...RICH_PAGE, photos: { hero: null, about: null, gallery: [] } }
    expect(allowedFor('hero', noPhotos).sort()).toEqual(['bigphone', 'contact', 'editorial', 'proof', 'stacked', 'typeled'])
    expect(allowedFor('about', noPhotos)).not.toContain('photo_split')
    expect(allowedFor('about', noPhotos)).not.toContain('banner')
    expect(allowedFor('why_us', noPhotos)).not.toContain('photo_points')
    expect(allowedFor('gallery', noPhotos)).toEqual([])
  })

  it('needs a real fact before a sticker can say anything', () => {
    const nothing = { ...RICH_PAGE, badges: [], rating: null, emergency: false, jobsDone: null, business: { ...RICH_PAGE.business, years: '' } }
    expect(allowedFor('hero', nothing)).not.toContain('sticker')
    expect(heroView(nothing).facts).toEqual([])
  })

  it('shows reviews only when there are reviews (the app only passes them with the reviews extra on)', () => {
    expect(allowedFor('testimonials', { ...RICH_PAGE, reviews: [], rating: null })).toEqual([])
    expect(allowedFor('testimonials', { ...RICH_PAGE, rating: null })).not.toContain('split')
  })

  it('keeps forms behind quoteForm, but phone and email layouts are always there', () => {
    const noForm = { ...RICH_PAGE, quoteForm: false }
    expect(allowedFor('contact', noForm)).not.toContain('form')
    expect(allowedFor('hero', noForm)).not.toContain('contact')
    expect(allowedFor('contact', noForm)).toEqual(expect.arrayContaining(['band', 'details', 'hours', 'inline', 'bigphone']))
  })

  it('never shows a rating that is not in the record', () => {
    const content = { ...RICH_PAGE, rating: null }
    for (const theme of THEME_KEYS) {
      const style = resolveSiteStyle(theme, '#1E88E5', 5)
      const page = resolvePage({ order: SECTION_KEYS, saved: {}, content, style, styleSeed: 5 })
      const html = page.map(s => renderPageSection(s, style, content)).join('')
      expect(html).not.toMatch(/from 27 reviews|Rated 4\.8/)
    }
  })

  it('never claims credentials in its own words: suggested lines stay about how the business works', () => {
    const claims = /insured|licen[cs]ed|certified|guarantee|accredited|registered|since \d|\d+ years/i
    for (const theme of THEME_KEYS) {
      const v = THEMES[theme].voice
      const lines = [...Object.values(v.eyebrows), v.titles.services, v.titles.whyUs, v.titles.gallery, v.titles.certifications, v.titles.reviews, ...v.why.flat()]
      for (const line of lines) expect(line, `${theme}: ${line}`).not.toMatch(claims)
    }
  })
})

describe('rhythm', () => {
  const page = (content: PageContent, seed: number, theme = THEME_KEYS[seed % 4]): { page: ResolvedSection[]; style: ReturnType<typeof resolveSiteStyle> } => {
    const s = resolveSiteStyle(theme, BRANDS[seed % BRANDS.length], seed)
    return { page: resolvePage({ order: SECTION_KEYS, saved: {}, content, style: s, styleSeed: seed }), style: s }
  }
  const sites = Array.from({ length: 24 }, (_, i) => ({ seed: i + 1, content: i % 2 ? RICH_PAGE : BARE_PAGE }))

  it.each(sites)('site $seed: no more loud bands than the theme allows, never two in a row', ({ seed, content }) => {
    const { page: p, style } = page(content, seed)
    const loud = p.map((s, i) => [s, i] as const).filter(([s]) => s.rhythm.band === 'brand' || s.rhythm.band === 'photo')
    expect(loud.length).toBeLessThanOrEqual(THEMES[style.theme].loud.max)
    loud.forEach(([, i], k) => { if (k > 0) expect(i - loud[k - 1][1]).toBeGreaterThan(1) })
  })

  it.each(sites)('site $seed: neighbouring full-width sections never share a background', ({ seed, content }) => {
    const { page: p } = page(content, seed)
    const panel = (s: ResolvedSection) => SECTIONS[s.type].panel?.(s.spec as never) ?? false
    p.forEach((s, i) => {
      if (i === 0 || panel(s) || panel(p[i - 1])) return
      expect(s.rhythm.band, `${p[i - 1].type} → ${s.type}`).not.toBe(p[i - 1].rhythm.band)
    })
  })

  it.each(sites)('site $seed: inset panels never sit on plain ground', ({ seed, content }) => {
    for (const s of page(content, seed).page) if (SECTIONS[s.type].panel?.(s.spec as never)) expect(s.rhythm.band).not.toBe('ground')
  })

  it.each(sites)('site $seed: motifs stay within the theme’s quotas', ({ seed, content }) => {
    const { page: p, style } = page(content, seed)
    const t = THEMES[style.theme]
    const drawn = p.filter(s => s.rhythm.motif).map(s => (s.spec.params as { motif?: string }).motif).filter((m): m is string => !!m && m !== 'none')
    for (const [m, rule] of Object.entries(t.motifs)) expect(drawn.filter(x => x === m).length, m).toBeLessThanOrEqual(rule!.maxPerPage)
  })

  it.each(sites)('site $seed: image sides zig-zag down the page', ({ seed, content }) => {
    const { page: p } = page(content, seed)
    const sided = p.filter(s => s.type !== 'hero' && SECTIONS[s.type].archetypes[s.spec.archetype].sided)
    sided.forEach((s, i) => { if (i > 0) expect(s.rhythm.side).not.toBe(sided[i - 1].rhythm.side) })
  })

  it('makes loud sections ones that pass contrast on the brand colour', () => {
    for (const { seed, content } of sites) {
      const { page: p, style: s } = page(content, seed)
      for (const loud of p.filter(x => x.rhythm.band === 'brand' && x.type !== 'hero')) {
        expect(SECTIONS[loud.type].staticChecks(loud.spec, s, 'brand').every(c => c.ok)).toBe(true)
      }
    }
  })

  it('shares out a motif in page order and never repeats an "apart" motif on neighbours', () => {
    const style = resolveSiteStyle('workwear', '#FFD400', 1)
    const withStripe = (spec: AnySpec): AnySpec => ({ ...spec, params: { ...spec.params, motif: 'stripe' } })
    const about = withStripe({ v: 2, section: 'about', archetype: 'photo_split', step: 0, params: { asym: '6/6', crop: '1:1', bleed: 'none', motif: 'none', at: 'br', rot: 0, stats: false, brk: 'band' } })
    const why = withStripe({ v: 2, section: 'why_us', archetype: 'rows', step: 0, params: { motif: 'none', brk: 'band' } })
    const r = solveRhythm([{ type: 'about', spec: about }, { type: 'why_us', spec: why }], SECTIONS, style)
    expect(r.about?.motif).toBe(true)
    expect(r.why_us?.motif).toBe(false)
  })

  it('gives no more loud bands when the hero is already loud in a one-loud theme', () => {
    const style = resolveSiteStyle('clean-pro', '#1F4FD8', 1)
    const loudHero: AnySpec = { v: 2, section: 'hero', archetype: 'typeled', step: 0, params: { trust: false, tone: 'brand', em: false, motif: 'none' } }
    const contactBand: AnySpec = { v: 2, section: 'contact', archetype: 'band', step: 0, params: { align: 'center', brk: 'band' } }
    const r = solveRhythm([{ type: 'hero', spec: loudHero }, { type: 'services', spec: SECTIONS.services.fallback }, { type: 'contact', spec: contactBand }], SECTIONS, style)
    expect(r.hero?.band).toBe('brand')
    expect(r.contact?.band).not.toBe('brand')
  })

  it('changing one section only re-solves the rhythm, never other sections’ specs', () => {
    const style = resolveSiteStyle('workwear', '#FFD400', 5)
    const saved = Object.fromEntries(resolvePage({ order: SECTION_KEYS, saved: {}, content: RICH_PAGE, style, styleSeed: 5 })
      .map(s => [s.type, { seed: s.seed, spec: s.spec }]))
    const before = resolvePage({ order: SECTION_KEYS, saved, content: RICH_PAGE, style, styleSeed: 5 })
    const hero: AnySpec = { v: 2, section: 'hero', archetype: 'typeled', step: 0, params: { trust: true, tone: 'brand', em: true, motif: 'none' } }
    const after = resolvePage({ order: SECTION_KEYS, saved: { ...saved, hero: { seed: 1, spec: hero } }, content: RICH_PAGE, style, styleSeed: 5 })
    for (const s of after.filter(x => x.type !== 'hero')) expect(s.spec).toEqual(before.find(b => b.type === s.type)!.spec)
    expect(after.map(s => s.rhythm)).not.toEqual(before.map(s => s.rhythm))
  })

  it('never puts a loud band beside a strong fixed band (a dark footer, a photo hero)', () => {
    for (const { seed, content } of sites) {
      const p = page(content, seed).page
      p.forEach((s, i) => {
        if (s.rhythm.band !== 'brand' || s.type === 'hero') return
        for (const n of [p[i - 1], p[i + 1]]) if (n) expect(['brand', 'ink', 'photo'], `${s.type} beside ${n.type}`).not.toContain(n.rhythm.band)
      })
    }
  })

  it('ends every page on the footer, on the ground or the inverse band', () => {
    for (const { seed, content } of sites) {
      const last = page(content, seed).page.at(-1)!
      expect(last.type).toBe('footer')
      expect(['ground', 'ink']).toContain(last.rhythm.band)
    }
  })
})

describe('review regressions', () => {
  const friendly = resolveSiteStyle('friendly-local', '#0B6E6D', 1)

  it('never prints a sticker with nothing true to say', () => {
    const spec: AnySpec = { v: 2, section: 'about', archetype: 'photo_split', step: 0, params: { asym: '6/6', crop: '1:1', bleed: 'none', motif: 'sticker', at: 'ob', rot: 4, stats: false, brk: 'band' } }
    const noFacts = { ...RICH_PAGE, badges: [], rating: null, reviews: [], emergency: false, jobsDone: null, business: { ...RICH_PAGE.business, years: '' } }
    const html = SECTIONS.about.render(spec, friendly, viewOf('about', noFacts), { band: 'ground', side: 'left', motif: true })
    expect(html).not.toMatch(/undefined/)
    expect(html).not.toContain('sb-sticker')
  })

  it('counts the stickers a layout always draws against the page quota', () => {
    const hero: AnySpec = { v: 2, section: 'hero', archetype: 'sticker', step: 0, params: { asym: '6/6', side: 'right', crop: '1:1', rot: 4, count: 1, motif: 'sticker', blob: false, em: false } }
    const trust: AnySpec = { v: 2, section: 'trust_bar', archetype: 'stickers', step: 0, params: { rot: 4, align: 'center', motif: 'sticker' } }
    const r = solveRhythm([{ type: 'hero', spec: hero }, { type: 'trust_bar', spec: trust }], SECTIONS, friendly)
    expect(r.hero?.motif).toBe(true)
    expect(r.trust_bar?.motif).toBe(false)
    const html = SECTIONS.trust_bar.render(trust, friendly, viewOf('trust_bar', RICH_PAGE), r.trust_bar!)
    expect(html).not.toContain('sb-sticker')
  })

  it('keeps decorations on the photo’s outer side whichever side the rhythm gives it', () => {
    const style = resolveSiteStyle('workwear', '#FFD400', 1)
    const spec: AnySpec = { v: 2, section: 'about', archetype: 'photo_split', step: 0, params: { asym: '6/6', crop: '1:1', bleed: 'none', motif: 'stripe', at: 'ob', rot: 0, stats: false, brk: 'band' } }
    const at = (side: 'left' | 'right') => SECTIONS.about.render(spec, style, viewOf('about', RICH_PAGE), { band: 'ground', side, motif: true }).match(/sb-stripe sb-at--(\w+)/)?.[1]
    expect(at('right')).toBe('br')
    expect(at('left')).toBe('bl')
  })
})

describe('safety nets', () => {
  const style = resolveSiteStyle('clean-pro', '#1E88E5', 5)

  it('keeps the trade’s own section order', () => {
    const order: SectionKey[] = ['hero', 'trust_bar', 'certifications', 'services', 'testimonials', 'contact', 'footer']
    expect(resolvePage({ order, saved: {}, content: RICH_PAGE, style, styleSeed: 5 }).map(s => s.type)).toEqual(order)
  })

  it('drops to a plain background if even the safe layout fails on a stale brand band', () => {
    const weak = { ...style, palette: { ...style.palette, brandFill: '#888888', brandInk: '#FFFFFF' } }
    const html = renderPageSection({ type: 'services', spec: SECTIONS.services.fallback, rhythm: { band: 'brand', side: 'right', motif: true } }, weak, RICH_PAGE)
    expect(html).toContain('sb-tone--ground')
    expect(html).not.toContain('sb-tone--brand')
  })

  it('renders a spec from another theme as that section’s safe layout', () => {
    const bigphone: AnySpec = { v: 2, section: 'hero', archetype: 'bigphone', step: 0, params: { photo: false, side: 'left', crop: '1:1', motif: 'none', at: 'br', tone: 'ground', em: false } }
    const html = renderPageSection({ type: 'hero', spec: bigphone, rhythm: { band: 'ground', side: 'right', motif: true } }, style, RICH_PAGE)
    expect(html).toContain('sb-hero--stacked')
  })

  it('never links the hero to a contact section that isn’t there', () => {
    const unreachable = { ...BARE_PAGE, business: { ...BARE_PAGE.business, tel: null, phone: '', email: '' } }
    expect(presentSections(SECTION_KEYS, unreachable)).not.toContain('contact')
    expect(heroView(unreachable).quote).toBeNull()
    expect(heroView(BARE_PAGE).quote?.href).toBe('#contact')
  })
})
