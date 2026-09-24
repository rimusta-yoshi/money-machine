import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { painter } from '../trades/painter'
import { createSite } from './defaults'
import { buildChecklist, isReadyToPublish } from './checklist'
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

  it('asks for opening hours only with the full contact layout', () => {
    const base = createSite(plumber)
    expect(ids({ ...base, selections: { contact: 'contact-full' } })).toContain('hours')
    expect(ids({ ...base, selections: { contact: 'contact-simple' } })).not.toContain('hours')
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

describe('isReadyToPublish', () => {
  it('needs a name, phone and valid email', () => {
    const site = createSite(plumber)
    expect(isReadyToPublish(site)).toBe(false)
    const ready = { ...site, business: { ...site.business, name: 'Joe', phone: '0113 496 0000', email: 'joe@example.com' } }
    expect(isReadyToPublish(ready)).toBe(true)
    expect(isReadyToPublish({ ...ready, business: { ...ready.business, email: 'nope' } })).toBe(false)
  })
})
