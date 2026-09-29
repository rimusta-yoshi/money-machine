import { describe, expect, it } from 'vitest'
import {
  allowed, candidateSeed, generateOptions, generateSpec, isPresent, specKey,
} from './core/pipeline'
import {
  estimateMeasurer, LOUD_PRIORITY, presentSections, resolvePage, resolveSiteStyle, sectionSchemas, SECTION_KEYS, SECTIONS,
  solveRhythm, THEME_KEYS, viewOf,
} from '.'
import type { AnySpec, PageContent, ResolvedSection, SectionKey } from '.'
import { heroView, renderPageSection } from '.'
import { BARE_PAGE, BRANDS, RICH_PAGE } from './test/fixtures'

const style = resolveSiteStyle('professional', '#1E88E5', 5)
const NON_HERO = SECTION_KEYS.filter(k => k !== 'hero')
const view = (t: SectionKey, c: PageContent = RICH_PAGE) => viewOf(t, c) as never

describe.each(NON_HERO)('%s', type => {
  const def = SECTIONS[type]

  it('gives an identical spec for the same seed and content', () => {
    for (let i = 0; i < 30; i++) {
      const seed = candidateSeed(9, i)
      expect(generateSpec(def, seed, view(type), style)).toEqual(generateSpec(def, seed, view(type, { ...RICH_PAGE }), style))
    }
  })

  it('uses every archetype when the content allows all of them', () => {
    const seen = new Set(Array.from({ length: 300 }, (_, i) => generateSpec(def, candidateSeed(3, i), view(type), style).archetype))
    // The contact form is behind a flag in the app, but RICH_PAGE switches it on.
    expect([...seen].sort()).toEqual(Object.keys(def.archetypes).sort())
  })

  it.each(THEME_KEYS.flatMap(t => BRANDS.slice(0, 3).map(b => [t, b] as const)))('%s / %s: shows distinct options that all pass every hard check', (theme, brand) => {
    const s = resolveSiteStyle(theme, brand, 7)
    const { shown } = generateOptions(def, { batchSeed: 4, content: view(type), style: s, measurer: estimateMeasurer })
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.length).toBeLessThanOrEqual(6)
    expect(new Set(shown.map(c => specKey(c.spec))).size).toBe(shown.length)
    for (const c of shown) {
      expect(c.checks.filter(x => !x.ok)).toEqual([])
      expect(c.checks.map(x => x.id)).toEqual(expect.arrayContaining(['tap-targets', 'fits-phone-width']))
    }
  })

  it('only shows specs that survive a JSON round trip through the stored schema', () => {
    const { shown } = generateOptions(def, { batchSeed: 2, content: view(type), style, measurer: estimateMeasurer })
    const schema = sectionSchemas[type as keyof typeof sectionSchemas]
    for (const { spec } of shown) expect(schema.parse(JSON.parse(JSON.stringify(spec)))).toEqual(spec)
  })

  it('has a fallback that is valid and always allowed whenever the section is present', () => {
    const schema = sectionSchemas[type as keyof typeof sectionSchemas]
    expect(() => schema.parse(def.fallback)).not.toThrow()
    for (const c of [RICH_PAGE, BARE_PAGE]) {
      if (isPresent(def, view(type, c))) expect(def.archetypes[def.fallback.archetype].gate(view(type, c))).toBe(true)
    }
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
    expect(allowedFor('about', noPhotos)).not.toContain('photo_split')
    expect(allowedFor('about', noPhotos)).not.toContain('banner')
    expect(allowedFor('why_us', noPhotos)).not.toContain('photo_points')
    expect(allowedFor('gallery', noPhotos)).toEqual([])
    const two = { ...RICH_PAGE, photos: { ...RICH_PAGE.photos, gallery: RICH_PAGE.photos.gallery.slice(0, 2) } }
    expect(allowedFor('gallery', two)).toEqual(['strip'])
  })

  it('shows reviews only when there are reviews (the app only passes them with the reviews extra on)', () => {
    expect(allowedFor('testimonials', { ...RICH_PAGE, reviews: [], rating: null })).toEqual([])
    expect(allowedFor('testimonials', { ...RICH_PAGE, rating: null })).not.toContain('split')
  })

  it('keeps the contact form behind quoteForm, but phone and email layouts are always there', () => {
    const noForm = { ...RICH_PAGE, quoteForm: false }
    expect(allowedFor('contact', noForm)).not.toContain('form')
    expect(allowedFor('contact', noForm)).toEqual(expect.arrayContaining(['band', 'details', 'hours', 'inline']))
  })

  it('never shows a rating that is not in the record', () => {
    const page = resolvePage({ order: SECTION_KEYS, saved: {}, content: { ...RICH_PAGE, rating: null }, style, styleSeed: 5 })
    const html = page.map(s => SECTIONS[s.type].render(s.spec, style, viewOf(s.type, { ...RICH_PAGE, rating: null }), s.rhythm)).join('')
    expect(html).not.toMatch(/from 27 reviews|Rated 4\.8 from/)
  })
})

describe('rhythm', () => {
  const page = (content: PageContent, seed: number, theme = THEME_KEYS[seed % 4]): { page: ResolvedSection[]; style: ReturnType<typeof resolveSiteStyle> } => {
    const s = resolveSiteStyle(theme, BRANDS[seed % BRANDS.length], seed)
    return { page: resolvePage({ order: SECTION_KEYS, saved: {}, content, style: s, styleSeed: seed }), style: s }
  }
  const sites = Array.from({ length: 24 }, (_, i) => ({ seed: i + 1, content: i % 2 ? RICH_PAGE : BARE_PAGE }))

  it.each(sites)('site $seed: at most one loud section', ({ seed, content }) => {
    const { page: p } = page(content, seed)
    const loud = p.filter(s => s.rhythm.band === 'brand' || s.rhythm.band === 'photo')
    expect(loud.length).toBeLessThanOrEqual(1)
  })

  it.each(sites)('site $seed: neighbouring sections never share a background', ({ seed, content }) => {
    const { page: p } = page(content, seed)
    p.forEach((s, i) => { if (i > 0) expect(s.rhythm.band, `${p[i - 1].type} → ${s.type}`).not.toBe(p[i - 1].rhythm.band) })
  })

  it.each(sites)('site $seed: image sides zig-zag down the page', ({ seed, content }) => {
    const { page: p } = page(content, seed)
    const sided = p.filter(s => s.type === 'hero'
      ? ['split', 'offset'].includes(s.spec.archetype)
      : SECTIONS[s.type].archetypes[s.spec.archetype].sided)
    sided.forEach((s, i) => { if (i > 0) expect(s.rhythm.side).not.toBe(sided[i - 1].rhythm.side) })
  })

  it('makes the loud section one that passes contrast on the brand colour', () => {
    for (const { seed, content } of sites) {
      const { page: p, style: s } = page(content, seed)
      const loud = p.find(x => x.rhythm.band === 'brand' && x.type !== 'hero')
      if (loud) expect(SECTIONS[loud.type].staticChecks(loud.spec, s, 'brand').every(c => c.ok)).toBe(true)
    }
  })

  it('prefers the contact section for the loud band when the hero is quiet', () => {
    const contactBand: AnySpec = { v: 1, section: 'contact', archetype: 'band', params: { align: 'center' } }
    const quietHero: AnySpec = { v: 1, section: 'hero', archetype: 'stacked', params: { align: 'left', image: 'none', tone: 'ground' } }
    const r = solveRhythm([{ type: 'hero', spec: quietHero }, { type: 'why_us', spec: SECTIONS.why_us.fallback }, { type: 'contact', spec: contactBand }], SECTIONS, style)
    expect(LOUD_PRIORITY[0]).toBe('contact')
    expect(r.contact?.band).toBe('brand')
  })

  it('gives no other section the loud band when the hero is already loud', () => {
    const loudHero: AnySpec = { v: 1, section: 'hero', archetype: 'typeled', params: { trust: false, scale: 1.2, tone: 'brand' } }
    const contactBand: AnySpec = { v: 1, section: 'contact', archetype: 'band', params: { align: 'center' } }
    const r = solveRhythm([{ type: 'hero', spec: loudHero }, { type: 'contact', spec: contactBand }], SECTIONS, style)
    expect(r.hero?.band).toBe('brand')
    expect(r.contact?.band).not.toBe('brand')
  })

  it('changing one section only re-solves the rhythm, never other sections’ specs', () => {
    const saved = Object.fromEntries(resolvePage({ order: SECTION_KEYS, saved: {}, content: RICH_PAGE, style, styleSeed: 5 })
      .map(s => [s.type, { seed: s.seed, spec: s.spec }]))
    const before = resolvePage({ order: SECTION_KEYS, saved, content: RICH_PAGE, style, styleSeed: 5 })
    const hero: AnySpec = { v: 1, section: 'hero', archetype: 'typeled', params: { trust: true, scale: 1.3, tone: 'brand' } }
    const after = resolvePage({ order: SECTION_KEYS, saved: { ...saved, hero: { seed: 1, spec: hero } }, content: RICH_PAGE, style, styleSeed: 5 })
    for (const s of after.filter(x => x.type !== 'hero')) expect(s.spec).toEqual(before.find(b => b.type === s.type)!.spec)
    expect(after.map(s => s.rhythm)).not.toEqual(before.map(s => s.rhythm))
  })

  it('always puts the footer on its own ink band', () => {
    for (const { seed, content } of sites) expect(page(content, seed).page.at(-1)).toMatchObject({ type: 'footer', rhythm: { band: 'ink' } })
  })
})

describe('review fixes', () => {
  it('keeps the trade’s own section order', () => {
    const order: SectionKey[] = ['hero', 'trust_bar', 'certifications', 'services', 'testimonials', 'contact', 'footer']
    const p = resolvePage({ order, saved: {}, content: RICH_PAGE, style, styleSeed: 5 })
    expect(p.map(s => s.type)).toEqual(order)
  })

  it('puts text first in the markup of every sided layout, so the image side comes only from the rhythm', () => {
    for (const type of NON_HERO) {
      const def = SECTIONS[type]
      for (const [archetype, a] of Object.entries(def.archetypes)) {
        if (!a.sided) continue
        const spec = Array.from({ length: 400 }, (_, i) => generateSpec(def, candidateSeed(1, i), view(type), style)).find(x => x.archetype === archetype)!
        for (const side of ['left', 'right'] as const) {
          const html = def.render(spec, style, view(type), { band: 'ground', side })
          expect(html).toContain(`sb-img--${side}`)
          const split = html.slice(html.indexOf('class="sb-split'))
          const firstChild = split.slice(split.indexOf('>') + 1, split.indexOf('>') + 60)
          expect(firstChild, `${type}/${archetype}`).not.toMatch(/sb-photo|sb-side-media/)
        }
      }
    }
  })

  it('drops to a plain background if even the safe layout fails on a stale brand band', () => {
    const weak = { ...style, palette: { ...style.palette, brandFill: '#888888', brandInk: '#FFFFFF' } }
    const html = renderPageSection({ type: 'services', spec: SECTIONS.services.fallback, rhythm: { band: 'brand', side: 'right' } }, weak, RICH_PAGE)
    expect(html).toContain('sb-tone--ground')
    expect(html).not.toContain('sb-tone--brand')
  })

  it('never links the hero to a contact section that isn’t there', () => {
    const unreachable = { ...BARE_PAGE, business: { ...BARE_PAGE.business, tel: null, phone: '', email: '' } }
    expect(presentSections(SECTION_KEYS, unreachable)).not.toContain('contact')
    expect(heroView(unreachable).quote).toBeNull()
    expect(heroView(BARE_PAGE).quote?.href).toBe('#contact')
  })
})
