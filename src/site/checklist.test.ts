import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { painter } from '../trades/painter'
import { createSite } from './defaults'
import { buildChecklist, isReadyToPublish, sectionChecklist, sectionForItem } from './checklist'
import type { Site } from './schema'

const ids = (site: Site, trade = plumber) => buildChecklist(site, trade).map(i => i.id)

describe('buildChecklist', () => {
  it('lists only content used by sections this site actually has', () => {
    const list = ids(createSite(painter), painter)
    expect(list).not.toContain('areas')
    expect(list).not.toContain('reviews')
    expect(list).toContain('photos.gallery')
  })

  it('asks for reviews and rating only when the reviews extra is on', () => {
    expect(ids(createSite(plumber))).not.toContain('reviews')
    expect(ids({ ...createSite(plumber), extras: ['reviews'] })).toEqual(expect.arrayContaining(['reviews', 'rating']))
  })

  it('asks for opening hours whenever the site has a contact section', () => {
    expect(ids(createSite(plumber))).toContain('hours')
  })

  it('marks items done once the customer fills them in', () => {
    const site = createSite(plumber)
    const filled = { ...site, content: { ...site.content, areas: ['Leeds'] } }
    expect(buildChecklist(filled, plumber).find(i => i.id === 'areas')?.done).toBe(true)
    expect(buildChecklist(site, plumber).find(i => i.id === 'areas')?.done).toBe(false)
  })

  it('treats "no emergency service" as answered', () => {
    const site = createSite(plumber)
    const answered = { ...site, content: { ...site.content, emergency: false } }
    expect(buildChecklist(answered, plumber).find(i => i.id === 'emergency')?.done).toBe(true)
  })
})

describe('sectionChecklist', () => {
  const ids = (site: Site, type: Parameters<typeof sectionChecklist>[2]) =>
    sectionChecklist(site, plumber, type).map(i => i.id)

  it('gives each section only its own content', () => {
    const site = createSite(plumber)
    expect(ids(site, 'hero')).toEqual(['photos.hero'])
    expect(ids(site, 'areas')).toEqual(['areas'])
    expect(ids(site, 'services')).toEqual(['emergency'])
    expect(ids(site, 'trust_bar')).toEqual(['badges', 'emergency', 'jobsDone'])
    expect(ids(site, 'why_us')).toEqual(['photos.about'])
    expect(ids(site, 'footer')).toEqual([])
  })

  it('respects the chosen layout and extras', () => {
    const site = createSite(plumber)
    expect(ids(site, 'testimonials')).toEqual([])
    expect(ids({ ...site, extras: ['reviews'] }, 'testimonials')).toEqual(['rating', 'reviews'])
    expect(ids(site, 'contact')).toEqual(['emergency', 'hours'])
  })
})

describe('sectionForItem', () => {
  it('finds the section where an item is edited', () => {
    const site = { ...createSite(plumber), extras: ['reviews' as const] }
    expect(sectionForItem(site, plumber, 'areas')).toBe('areas')
    expect(sectionForItem(site, plumber, 'reviews')).toBe('testimonials')
    // Edited in the first section on the page that uses it.
    expect(sectionForItem(site, plumber, 'emergency')).toBe('trust_bar')
  })

  it('picks whichever credentials section the trade actually has', () => {
    expect(sectionForItem(createSite(plumber), plumber, 'badges')).toBe('trust_bar')
  })
})

describe('isReadyToPublish', () => {
  it('needs a name, phone and valid email', () => {
    const site = createSite(plumber)
    expect(isReadyToPublish(site)).toBe(false)
    const ready = { ...site, business: { ...site.business, name: 'Joe', phone: '0113 496 0000', email: 'joe@example.com' } }
    expect(isReadyToPublish(ready)).toBe(true)
    expect(isReadyToPublish({ ...ready, business: { ...ready.business, email: 'nope' } })).toBe(false)
  })
})
