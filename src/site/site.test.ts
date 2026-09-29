import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { painter } from '../trades/painter'
import { createSite } from './defaults'
import { DEFAULT_THEME } from './style'
import { SiteParseError } from './schema'
import { parseSite } from './parse'
import type { Site } from './schema'

describe('createSite', () => {
  it('starts with the trade accent as brand colour and nothing filled in', () => {
    const site = createSite(plumber)
    expect(site.version).toBe(4)
    expect(site.tradeId).toBe('plumber')
    expect(site.brandColor).toBe(plumber.colorScheme.accent)
    expect(site.extras).toEqual([])
    expect(site.sections).toEqual({})
    expect(site.business).toEqual({ name: '', phone: '', location: '', about: '', yearsInBusiness: '', email: '' })
  })

  it('starts on the trade’s default theme, resolved from the style seed', () => {
    const site = createSite(painter, 5)
    expect(site.style.theme).toBe(DEFAULT_THEME.painter)
    expect(site.style.resolved.theme).toBe(DEFAULT_THEME.painter)
    expect(site.style.resolved.v).toBe(2)
    expect(createSite(painter, 5).style).toEqual(site.style)
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
    sections: { hero: { seed: 7, spec: { v: 2, section: 'hero', archetype: 'stacked', step: 0, params: { align: 'center', image: 'none', tone: 'surface', em: false } } } },
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
    expect(() => parseSite({ ...site, business: { ...site.business, about: 'x'.repeat(281) } })).toThrow(SiteParseError)
  })

  it('accepts photos as https links or images prepared in the builder', () => {
    const site = valid()
    const withHero = (url: string) => ({ ...site, content: { ...site.content, photos: { ...site.content.photos, hero: { url, alt: 'Van' } } } })
    expect(() => parseSite(withHero('https://cdn.example.com/van.webp'))).not.toThrow()
    expect(() => parseSite(withHero('data:image/webp;base64,UklGRg=='))).not.toThrow()
    expect(() => parseSite(withHero('data:image/jpeg;base64,/9j/4AAQ'))).not.toThrow()
  })

  it.each([
    'javascript:alert(1)',
    'http://insecure.example.com/van.jpg',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'https://x.example/a.jpg" onerror="alert(1)',
  ])('rejects the photo URL %s', url => {
    const site = valid()
    const bad = { ...site, content: { ...site.content, photos: { ...site.content.photos, hero: { url, alt: 'Van' } } } }
    expect(() => parseSite(bad)).toThrow(SiteParseError)
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
