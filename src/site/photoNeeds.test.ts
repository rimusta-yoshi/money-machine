import { describe, expect, it } from 'vitest'
import { estimateMeasurer, generateOptions, renderPageSection, SECTIONS, viewOf } from '../gen'
import type { AnySpec } from '../gen'
import { withSamplePhotos } from '../sample/content'
import { tradeById } from '../trades'
import { createSite } from './defaults'
import { pageContent } from './pageContent'
import { photoNeeds } from './photoNeeds'
import type { Site } from './schema'

const electrician = tradeById.electrician
const sample = [1, 2, 3].map(n => ({ url: `https://example.com/s${n}.jpg`, alt: `Sample ${n}` }))
const base = (): Site => {
  const s = createSite(electrician, 5)
  return { ...s, business: { ...s.business, name: 'Spark Co', phone: '01632 960 555' } }
}

/** The site with a saved hero entry (specs from the generator are loosely typed). */
const withHero = (s: Site, hero: { seed: number; spec: AnySpec; preferred?: AnySpec }): Site => ({ ...s, sections: { hero } } as Site)

/** A hero layout picked while sample photos were showing, which shows the photo. */
function photoHero(site: Site): AnySpec {
  const content = withSamplePhotos(pageContent(site, electrician), sample)
  for (let seed = 1; seed < 40; seed++) {
    const { shown } = generateOptions(SECTIONS.hero, { batchSeed: seed, content: viewOf('hero', content), style: site.style.resolved, measurer: estimateMeasurer })
    const hit = shown.find(c => renderPageSection({ type: 'hero', spec: c.spec, rhythm: { band: 'ground', side: 'right', motif: true } }, site.style.resolved, content).includes(sample[0].url))
    if (hit) return hit.spec
  }
  throw new Error('no photo hero found')
}

describe('photo layouts without photos', () => {
  it('are listed with what goes live meanwhile, not swapped silently', () => {
    const s = base()
    const site = withHero(s, { seed: 1, spec: photoHero(s) })
    const needs = photoNeeds(site, electrician)
    expect(needs.map(n => [n.section, n.slot])).toEqual([['hero', 'hero']])
    expect(renderPageSection(needs[0].live, site.style.resolved, pageContent(site, electrician))).not.toContain('example.com')
  })

  it('are listed after a repair kept the customer’s pick as preferred', () => {
    const s = base()
    const wanted = photoHero(s)
    const site = withHero(s, { seed: 1, spec: SECTIONS.hero.fallback, preferred: wanted })
    const [need] = photoNeeds(site, electrician)
    expect(need.section).toBe('hero')
    expect(need.swapped).toBe(true)
  })

  it('are cleared once the photo is added', () => {
    const s = base()
    const site = withHero(s, { seed: 1, spec: photoHero(s) })
    const withPhoto = { ...site, content: { ...site.content, photos: { ...site.content.photos, hero: { url: 'data:image/jpeg;base64,AAAA', alt: 'Our van' } } } }
    expect(photoNeeds(withPhoto, electrician)).toEqual([])
  })

  it('ignore layouts that never show a photo', () => {
    const s = base()
    expect(photoNeeds(withHero(s, { seed: 1, spec: SECTIONS.hero.fallback }), electrician)).toEqual([])
  })
})
