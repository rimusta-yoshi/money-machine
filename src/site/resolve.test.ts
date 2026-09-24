import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { createSite } from './defaults'
import { resolveContent } from './resolve'
import type { Site } from './schema'

const withContent = (patch: Partial<Site['content']>, extras: Site['extras'] = []): Site => {
  const site = createSite(plumber)
  return { ...site, extras, content: { ...site.content, ...patch } }
}

describe('resolveContent in the builder', () => {
  it('fills unset fields with trade examples, flagged as examples', () => {
    const r = resolveContent(createSite(plumber), plumber, 'builder')
    expect(r.areas?.example).toBe(true)
    expect(r.areas?.value.length).toBeGreaterThan(0)
    expect(r.hours?.example).toBe(true)
    expect(r.badges?.value).toEqual(plumber.trustSignals)
  })

  it('shows the customer’s own content unflagged', () => {
    const r = resolveContent(withContent({ areas: ['Headingley', 'Roundhay'] }), plumber, 'builder')
    expect(r.areas).toEqual({ value: ['Headingley', 'Roundhay'], example: false })
  })

  it('treats an empty list as unset', () => {
    const r = resolveContent(withContent({ areas: [] }), plumber, 'builder')
    expect(r.areas?.example).toBe(true)
  })
})

describe('resolveContent on a live site', () => {
  it('hides anything the customer has not provided', () => {
    const r = resolveContent(createSite(plumber), plumber, 'live')
    expect(r.areas).toBeNull()
    expect(r.hours).toBeNull()
    expect(r.badges).toBeNull()
    expect(r.jobsDone).toBeNull()
    expect(r.emergency).toBeNull()
    expect(r.photos.hero).toBeNull()
    expect(r.photos.gallery).toBeNull()
  })

  it('shows what the customer provided', () => {
    const r = resolveContent(withContent({ emergency: true, jobsDone: '500+' }), plumber, 'live')
    expect(r.emergency).toEqual({ value: true, example: false })
    expect(r.jobsDone).toEqual({ value: '500+', example: false })
  })

  it('treats an explicit "no emergency service" as a real answer', () => {
    const r = resolveContent(withContent({ emergency: false }), plumber, 'live')
    expect(r.emergency).toEqual({ value: false, example: false })
  })
})

describe('reviews extra', () => {
  it('shows no rating or reviews anywhere when the extra is off, even in the builder', () => {
    const r = resolveContent(withContent({ rating: { score: 4.8, count: 20 } }), plumber, 'builder')
    expect(r.rating).toBeNull()
    expect(r.reviews).toBeNull()
  })

  it('shows example reviews in the builder when the extra is on but empty', () => {
    const r = resolveContent(withContent({}, ['reviews']), plumber, 'builder')
    expect(r.reviews?.example).toBe(true)
    expect(r.rating?.example).toBe(true)
  })

  it('never publishes example reviews', () => {
    const r = resolveContent(withContent({}, ['reviews']), plumber, 'live')
    expect(r.reviews).toBeNull()
    expect(r.rating).toBeNull()
  })

  it('publishes the customer’s own reviews', () => {
    const reviews = [{ author: 'Sam', location: 'Leeds', text: 'Fixed our boiler fast.', rating: 5 }]
    const r = resolveContent(withContent({ reviews, rating: { score: 5, count: 1 } }, ['reviews']), plumber, 'live')
    expect(r.reviews).toEqual({ value: reviews, example: false })
    expect(r.rating).toEqual({ value: { score: 5, count: 1 }, example: false })
  })
})
