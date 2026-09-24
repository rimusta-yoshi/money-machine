import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { painter } from '../trades/painter'
import { createSite } from './defaults'
import { parseSite, SiteParseError } from './schema'
import type { Site } from './schema'

describe('createSite', () => {
  it('starts with the trade accent as brand colour and nothing filled in', () => {
    const site = createSite(plumber)
    expect(site.version).toBe(1)
    expect(site.tradeId).toBe('plumber')
    expect(site.brandColor).toBe(plumber.colorScheme.accent)
    expect(site.extras).toEqual([])
    expect(site.selections).toEqual({})
    expect(site.business).toEqual({ name: '', phone: '', location: '', about: '', yearsInBusiness: '', email: '' })
  })

  it('leaves every content field unset so nothing invented reaches a live site', () => {
    const { content } = createSite(painter)
    expect(content.badges).toBeNull()
    expect(content.areas).toBeNull()
    expect(content.hours).toBeNull()
    expect(content.emergency).toBeNull()
    expect(content.jobsDone).toBeNull()
    expect(content.rating).toBeNull()
    expect(content.reviews).toBeNull()
    expect(content.photos).toEqual({ hero: null, about: null, gallery: [] })
  })

  it('returns a fresh object each call', () => {
    const a = createSite(plumber)
    const b = createSite(plumber)
    expect(a).not.toBe(b)
    expect(a.content.photos.gallery).not.toBe(b.content.photos.gallery)
  })
})

describe('parseSite', () => {
  const valid = (): Site => ({
    ...createSite(plumber),
    business: { name: 'Joe Pipes', phone: '07700 900123', location: 'Leeds', about: '', yearsInBusiness: '12', email: 'joe@example.com' },
    extras: ['reviews'],
    selections: { hero: 'hero-dark' },
  })

  it('round-trips a valid site through JSON', () => {
    const site = valid()
    expect(parseSite(JSON.parse(JSON.stringify(site)))).toEqual(site)
  })

  it('rejects an unknown trade', () => {
    expect(() => parseSite({ ...valid(), tradeId: 'baker' })).toThrow(SiteParseError)
  })

  it('rejects a malformed brand colour', () => {
    expect(() => parseSite({ ...valid(), brandColor: 'red' })).toThrow(SiteParseError)
  })

  it('rejects an invalid email once one is given', () => {
    const site = valid()
    expect(() => parseSite({ ...site, business: { ...site.business, email: 'not-an-email' } })).toThrow(SiteParseError)
  })

  it('accepts an empty email while the site is still a draft', () => {
    const site = valid()
    expect(() => parseSite({ ...site, business: { ...site.business, email: '' } })).not.toThrow()
  })

  it('rejects review ratings outside 1 to 5', () => {
    const site = valid()
    const bad = { ...site, content: { ...site.content, reviews: [{ author: 'A', location: '', text: 'Great', rating: 6 }] } }
    expect(() => parseSite(bad)).toThrow(SiteParseError)
  })

  it('rejects photos with no description, so every image has alt text', () => {
    const site = valid()
    const bad = { ...site, content: { ...site.content, photos: { ...site.content.photos, hero: { url: 'https://x/y.jpg', alt: '' } } } }
    expect(() => parseSite(bad)).toThrow(SiteParseError)
  })

  it('rejects over-long text that would break layouts', () => {
    const site = valid()
    expect(() => parseSite({ ...site, business: { ...site.business, about: 'x'.repeat(161) } })).toThrow(SiteParseError)
  })

  it('gives a readable message naming the bad field', () => {
    try {
      parseSite({ ...valid(), brandColor: 'red' })
      expect.unreachable()
    } catch (e) {
      expect((e as Error).message).toContain('brandColor')
    }
  })
})
