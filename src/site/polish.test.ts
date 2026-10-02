/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  candidateSeed, estimateMeasurer, generateOptions, generateSpec, renderPage, renderPageSection, resolvePage, resolveSiteStyle,
  SECTION_KEYS, SECTIONS, solveRhythm, THEMES, viewOf,
} from '../gen'
import type { AnySpec, Generated } from '../gen'
import { verifySite } from '../builder/verifySite'
import { withSample } from '../sample/content'
import { trades, tradeById } from '../trades'
import { createSite } from './defaults'
import { FEATURES } from './features'
import { publishedPage, unsavedSections, withRhythm } from './page'
import { pageContent } from './pageContent'
import { parseSite } from './parse'
import { siteReducer } from './reducer'
import type { Site } from './schema'

const plumber = tradeById.plumber
const photo = (n: number) => ({ url: `https://example.com/p${n}.jpg`, alt: `Job ${n}` })

function site(patch: Partial<Site['content']> = {}, business: Partial<Site['business']> = {}): Site {
  const base = createSite(plumber, 7)
  return withRhythm({
    ...base,
    business: { ...base.business, name: 'Joe Pipes', phone: '0113 496 0000', location: 'Leeds', email: 'joe@example.com', ...business },
    content: { ...base.content, ...patch },
  }, plumber)
}

describe('suggested lines are only published once ticked or written', () => {
  it('leaves why-us off the page until the customer picks a line', () => {
    const s = site()
    expect(publishedPage(s, plumber).map(x => x.type)).not.toContain('why_us')
    const html = renderPage(publishedPage(s, plumber), s.style.resolved, pageContent(s, plumber))
    for (const [title] of THEMES[s.style.theme].voice.why) expect(html).not.toContain(title)
  })

  it('publishes exactly the lines the customer ticked or edited', () => {
    const s = site({ whyUs: [{ title: 'We answer the phone ourselves', text: 'No call centre.' }] })
    expect(publishedPage(s, plumber).map(x => x.type)).toContain('why_us')
    const html = renderPage(publishedPage(s, plumber), s.style.resolved, pageContent(s, plumber))
    expect(html).toContain('We answer the phone ourselves')
    for (const [title] of THEMES[s.style.theme].voice.why) expect(html).not.toContain(title)
  })

  it('shows the certificates note only when the customer adds it', () => {
    const electrician = tradeById.electrician
    const badges = ['NICEIC approved']
    const without = { ...site({ badges }), tradeId: electrician.id }
    const note = { ...site({ badges, certsNote: 'Certificates available on request.' }), tradeId: electrician.id }
    const render = (s: Site) => renderPage(publishedPage(s, electrician), s.style.resolved, pageContent(s, electrician))
    expect(render(without)).not.toContain('Certificates available on request')
    expect(render(note)).toContain('Certificates available on request')
  })

  it('keeps the new fields optional, so older records still parse', () => {
    const s = site()
    const { whyUs: _w, certsNote: _c, ...content } = s.content
    void _w; void _c
    expect(() => parseSite({ ...s, content })).not.toThrow()
  })
})

describe('no repeated content in neighbouring sections', () => {
  const style = resolveSiteStyle('clean-pro', '#1F4FD8', 3)
  const content = { ...pageContent(site({ badges: ['Gas Safe registered', 'Fully insured'], rating: { score: 4.8, count: 20 } }, {}), plumber), rating: { score: 4.8, count: 20 } }
  const hero: AnySpec = { v: 2, section: 'hero', archetype: 'split', step: 0, params: { asym: '6/6', side: 'right', valign: 'center', proof: 'strip', crop: '1:1', bleed: 'none', motif: 'ticks', at: 'ob', tone: 'ground', em: false, mphoto: 'bottom' } }
  const trust: AnySpec = { v: 2, section: 'trust_bar', archetype: 'strip', step: 0, params: { align: 'center', divider: 'dot', brk: 'band' } }

  it('drops the hero’s credential strip when the trust bar sits right under it', () => {
    const r = solveRhythm([{ type: 'hero', spec: hero }, { type: 'trust_bar', spec: trust }], SECTIONS, style)
    expect(r.hero?.omit).toEqual(expect.arrayContaining(['badges', 'rating']))
    expect(r.trust_bar?.omit).toEqual([])
    const withPhoto = { ...content, photos: { ...content.photos, hero: photo(1) } }
    const html = renderPageSection({ type: 'hero', spec: hero, rhythm: r.hero! }, style, withPhoto)
    expect(html).not.toContain('Gas Safe registered')
    expect(html).not.toContain('4.8 from 20 reviews')
  })

  it('keeps it when something else sits between them', () => {
    const r = solveRhythm([{ type: 'hero', spec: hero }, { type: 'services', spec: SECTIONS.services.fallback }, { type: 'trust_bar', spec: trust }], SECTIONS, style)
    expect(r.hero?.omit).toEqual([])
  })

  it('never leaves neighbours repeating a shown fact on real pages', () => {
    for (const theme of Object.keys(THEMES) as (keyof typeof THEMES)[]) for (let seed = 1; seed < 6; seed++) {
      const s = withSample(pageContent(site(), plumber), [photo(1), photo(2), photo(3), photo(4), photo(5)], THEMES[theme].voice.why)
      const st = resolveSiteStyle(theme, '#1E88E5', seed)
      const page = resolvePage({ order: SECTION_KEYS, saved: {}, content: s, style: st, styleSeed: seed })
      page.forEach((sec, i) => {
        const next = page[i + 1]
        if (!next) return
        const shows = (x: typeof sec) => (SECTIONS[x.type].archetypes[x.spec.archetype]?.shows?.(x.spec.params as never) ?? [])
          .map(f => f.facet).filter(f => !(x.rhythm.omit ?? []).includes(f))
        const shared = shows(sec).filter(f => shows(next).includes(f))
        const bothCore = (f: string) => [sec, next].every(x => SECTIONS[x.type].archetypes[x.spec.archetype]?.shows?.(x.spec.params as never).find(v => v.facet === f)?.core)
        expect(shared.filter(f => !bothCore(f)), `${theme}/${seed}: ${sec.type} → ${next.type}`).toEqual([])
      })
    }
  })
})

describe('every section is measured before the finish step', () => {
  it('saves a measured layout for every section on the page, so publishing never has to guess', async () => {
    const s = site({ badges: ['Gas Safe registered'], areas: ['Leeds'], whyUs: [{ title: 'Quick replies', text: 'We call back.' }] })
    expect(unsavedSections(s, plumber).length).toBeGreaterThan(0)
    const results = await verifySite(s, plumber, { open: async () => ({ ...estimateMeasurer, dispose: () => {} }) })
    const after = results.reduce<Site | null>((acc, v) => siteReducer(acc, v.status === 'chosen'
      ? { type: 'pickSection', section: v.type, value: v.entry }
      : { type: 'repairSection', section: v.type, value: v.entry }), s)!
    expect(unsavedSections(after, plumber)).toEqual([])
    expect(results.every(v => v.status === 'chosen')).toBe(true)
  })

  it('repairs a saved pick that no longer fits, keeping the customer’s own as preferred', async () => {
    const saved: Generated = { seed: 1, spec: SECTIONS.hero.fallback }
    const s = { ...site(), sections: { hero: saved } } as Site
    const failHeroFallback = { open: async () => ({
      measure: (i: Parameters<typeof estimateMeasurer.measure>[0]) => (JSON.stringify(i.spec) === JSON.stringify(saved.spec) ? { ...estimateMeasurer.measure(i), minTapPx: 10 } : estimateMeasurer.measure(i)),
      dispose: () => {},
    }) }
    const hero = (await verifySite(s, plumber, failHeroFallback)).find(v => v.type === 'hero')
    expect(hero?.status).toBe('repaired')
    expect(hero?.entry.preferred).toEqual(saved.spec)
  })
})

describe('quote forms stay hidden while enquiries are off', () => {
  it('is off in this build', () => expect(FEATURES.enquiries).toBe(false))

  it('never draws a form on a published page, even with an email', () => {
    for (const trade of trades) {
      const s = { ...site({}, {}), tradeId: trade.id }
      const html = renderPage(publishedPage(s, trade), s.style.resolved, pageContent(s, trade))
      expect(pageContent(s, trade).quoteForm).toBe(false)
      expect(html).not.toMatch(/<form/)
    }
  })

  it('keeps forms hidden in the builder’s sample content too', () => {
    const c = withSample(pageContent(site(), plumber), [photo(1)])
    expect(c.quoteForm).toBe(false)
    for (const type of ['hero', 'contact'] as const) {
      for (let i = 0; i < 200; i++) expect(generateSpec(SECTIONS[type], candidateSeed(3, i), viewOf(type, c) as never, resolveSiteStyle('clean-pro', '#1F4FD8', 1)).archetype).not.toBe(type === 'hero' ? 'contact' : 'form')
    }
  })
})

describe('theme tuning', () => {
  it('Clean Pro prefers layouts with one big focal point over rows of small cards', () => {
    const style = resolveSiteStyle('clean-pro', '#1F4FD8', 4)
    const content = withSample(pageContent(site(), plumber), [photo(1), photo(2), photo(3), photo(4), photo(5)], THEMES['clean-pro'].voice.why)
    const cardGrids: Record<string, string> = { services: 'cards', why_us: 'grid', trust_bar: 'tiles', certifications: 'cards', testimonials: 'cards' }
    for (const [type, grid] of Object.entries(cardGrids)) {
      const def = SECTIONS[type as keyof typeof SECTIONS]
      const w = def.weights['clean-pro']
      const total = Object.values(w).reduce((a, b) => a + b, 0)
      expect((w[grid] ?? 0) / total, type).toBeLessThan(0.15)
      const { shown } = generateOptions(def, { batchSeed: 5, content: viewOf(type as never, content), style, measurer: estimateMeasurer })
      expect(shown[0].spec.archetype, `${type} leads with a focal layout`).not.toBe(grid)
    }
  })

  it('Friendly Local heroes nearly always get a blob or stickers', () => {
    const style = resolveSiteStyle('friendly-local', '#0B6E6D', 2)
    const content = withSample(pageContent(site(), plumber), [photo(1), photo(2)])
    const heroes = Array.from({ length: 300 }, (_, i) => generateSpec(SECTIONS.hero, candidateSeed(8, i), viewOf('hero', content) as never, style))
      .filter(s => s.archetype === 'split' || s.archetype === 'sticker')
    const decorated = heroes.filter(s => {
      const p = s.params as { motif?: string; blob?: boolean }
      return p.motif === 'blob' || p.motif === 'sticker' || p.blob
    })
    expect(heroes.length).toBeGreaterThan(100)
    expect(decorated.length / heroes.length).toBeGreaterThan(0.9)
  })
})

describe('copy', () => {
  /** Words allowed a capital mid-sentence: names, schemes and abbreviations. */
  const PROPER = /^(Gas|Safe|NICEIC|EV|Part|P|UK|I)$/
  const lines = trades.flatMap(t => [t.tagline, t.ctaText, t.ctaSubtext, t.offer, ...t.services, ...t.trustSignals])
    .concat(Object.values(THEMES).flatMap(t => [...Object.values(t.voice.eyebrows), t.voice.titles.services, t.voice.titles.whyUs, t.voice.titles.gallery, t.voice.titles.certifications, t.voice.titles.reviews, ...t.voice.why.flat()]))

  it('uses sentence case in every suggested line', () => {
    for (const line of lines) for (const sentence of line.split(/(?<=[.!?])\s+/)) {
      const words = sentence.split(/[\s—–-]+/).slice(1).filter(w => /^[A-Z]/.test(w) && !PROPER.test(w.replace(/[^\w]/g, '')))
      expect(words, line).toEqual([])
    }
  })

  it('writes the offer line naturally', () => {
    expect(pageContent(site(), plumber).trade.offer).toBe('Free quotes')
    const s = site()
    const html = renderPage(publishedPage(s, plumber), s.style.resolved, pageContent(s, plumber))
    expect(html).toContain('Free quotes across Leeds. No obligation.')
    expect(html).not.toMatch(/Get a Free Quote across/)
  })
})

describe('sample stock photos', () => {
  const dir = join(__dirname, '..', '..', 'reference', 'sample-photos')

  it('are all listed in the licence note, and nothing unlisted is kept', () => {
    const licence = readFileSync(join(dir, 'LICENCE.md'), 'utf8')
    const files = readdirSync(dir).filter(f => f.endsWith('.jpg'))
    expect(files.length).toBeGreaterThanOrEqual(8)
    for (const f of files) expect(licence).toContain(`| ${f} |`)
    expect(licence).toMatch(/Pexels License/)
  })

  it('never ship inside the app: they live outside public/, and production loads them only from our storage', () => {
    const publicDir = join(__dirname, '..', '..', 'public')
    expect(existsSync(join(publicDir, 'sample-photos'))).toBe(false)
    const loader = readFileSync(join(__dirname, '..', 'sample', 'stockPhotos.ts'), 'utf8')
    expect(loader).not.toMatch(/import [^\n]*\.jpg/)
    expect(loader).toContain('VITE_SAMPLE_PHOTOS_URL')
    expect(loader.match(/'Sample photo: /g)?.length).toBe(readdirSync(dir).filter(f => f.endsWith('.jpg')).length)
  })

  it('are never used for the examples customers see', () => {
    const example = readFileSync(join(__dirname, '..', 'builder', 'ExampleSection.tsx'), 'utf8')
    expect(example).not.toMatch(/stockPhotos/)
  })
})
