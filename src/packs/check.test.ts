import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WAITING_PACKS } from '.'
import { PAGE_PACKS as PACKS } from './pages'
import { checkPacks, formatReport, licencedPages } from './check'
import type { CheckInput } from './check'
import type { Pack } from './schema'

const plumber = PACKS[0]
const root = process.cwd()
const photosDir = join(root, 'reference', 'sample-photos')
const REAL: CheckInput = {
  live: PACKS,
  waiting: WAITING_PACKS,
  packFiles: readdirSync(join(root, 'src', 'packs', 'business')).filter(f => f.endsWith('.ts')).map(f => f.slice(0, -3)),
  photoFiles: new Set(readdirSync(photosDir)),
  licence: readFileSync(join(photosDir, 'LICENCE.md'), 'utf8'),
  publicFiles: new Set(),
}

/** A second pack that's plumber in all but name: the near-duplicate the check exists for. */
const swapped = (p: Pack, id: string, name: string, plural: string): Pack => {
  const swap = (t: string) => t.replace(/plumbers/g, plural).replace(/plumber/gi, name).replace(/plumbing/gi, name)
  return {
    ...p, id, slug: `${id}-websites`, name, plural, synonyms: [`${id} things`],
    landing: {
      ...p.landing,
      intro: p.landing.intro.map(swap),
      needs: p.landing.needs.map(n => ({ title: swap(n.title), text: swap(n.text) })),
      faqs: p.landing.faqs.map(f => ({ q: swap(f.q), a: swap(f.a) })),
    },
  }
}

const run = (o: Partial<CheckInput>) => checkPacks({ ...REAL, ...o })

describe('pack:check', () => {
  it('passes every pack in the repo', () => {
    const r = checkPacks(REAL)
    expect(r.errors).toEqual([])
    expect(r.blocked).toEqual([])
    expect(formatReport(r, PACKS.length)).toContain('pack:check passed')
  })

  it('reports a missing field by pack and path', () => {
    const rest = Object.fromEntries(Object.entries(plumber).filter(([k]) => k !== 'landing'))
    const r = run({ live: [rest, ...PACKS.slice(1)] })
    expect(r.errors.some(e => e.startsWith('PACKS[0] (plumber): landing'))).toBe(true)
  })

  it('needs every photo on disk and listed in LICENCE.md with the same page', () => {
    const photo = { ...plumber.photos[0], file: 'not-here.jpg' }
    const wrongPage = { ...plumber.photos[1], credit: { ...plumber.photos[1].credit, page: 'https://www.pexels.com/photo/somewhere-else-1/' } }
    const r = run({ live: [{ ...plumber, photos: [photo, wrongPage, ...plumber.photos.slice(2)] }, ...PACKS.slice(1)] })
    expect(r.errors).toContain('plumber: photo not-here.jpg isn\'t in reference/sample-photos')
    expect(r.errors).toContain('plumber: photo not-here.jpg isn\'t listed in reference/sample-photos/LICENCE.md')
    expect(r.errors.some(e => e.includes(`${wrongPage.file}'s Pexels page doesn't match`))).toBe(true)
  })

  it('reads the licence table', () => {
    expect(licencedPages(REAL.licence).get('bathroom.jpg')).toBe(plumber.photos[0].credit.page)
  })

  it('refuses template text left in', () => {
    const r = run({ live: [{ ...plumber, landing: { ...plumber.landing, headline: 'TODO: a headline' } }, ...PACKS.slice(1)] })
    expect(r.errors.some(e => e.includes('unfinished text: "TODO: a headline"'))).toBe(true)
  })

  it('reports a pack waiting on a section that isn\'t built, and what it would unlock', () => {
    const cafe = swapped(plumber, 'cafe', 'Cafe', 'cafes')
    const waiting = { ...cafe, sections: [{ type: 'hero' }, { type: 'menu' }, { type: 'opening_hours', optional: true }, { type: 'contact' }] }
    const r = run({ waiting: [waiting], packFiles: [...REAL.packFiles, 'cafe'] })
    expect(r.blocked).toEqual([{ pack: 'cafe', sections: ['menu'] }])
    expect(r.unlocks).toEqual([{ section: 'menu', packs: ['cafe'] }, { section: 'opening_hours', packs: ['cafe'] }])
    expect(formatReport(r, 6)).toContain('cafe: blocked on section menu')
  })

  it('stops a live pack that needs an unbuilt section', () => {
    const r = run({ live: [{ ...plumber, sections: [...plumber.sections, { type: 'price_list' }] }, ...PACKS.slice(1)] })
    expect(r.errors).toContain('plumber: needs price_list, which isn\'t built yet: move it to WAITING_PACKS')
  })

  it('flags a pack that only swaps the trade name', () => {
    const r = run({ live: [...PACKS, swapped(plumber, 'heating', 'Heating engineer', 'heating engineers')], packFiles: [...REAL.packFiles, 'heating'] })
    expect(r.errors.some(e => e.startsWith('plumber and heating read too alike'))).toBe(true)
  })

  it('refuses a synonym two packs claim', () => {
    const r = run({ live: [...PACKS.slice(0, 4), { ...PACKS[4], synonyms: [...PACKS[4].synonyms, 'sparky'] }] })
    expect(r.errors).toContain('"sparky" is used by both electrician and landscaper: give it to one of them')
  })

  it('finds a pack file that isn\'t listed', () => {
    expect(run({ packFiles: [...REAL.packFiles, 'baker'] }).errors[0]).toMatch(/^src\/packs\/business\/baker\.ts isn't in PACKS/)
  })

  it('warns when a page has no preview image or example shots yet', () => {
    expect(run({}).warnings.some(w => w.startsWith('plumber: no og/plumbers.png'))).toBe(true)
  })
})
