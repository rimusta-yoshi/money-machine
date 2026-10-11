import { describe, expect, it } from 'vitest'
import { cleanTag, sourceFromSearch, withSource } from './source'

describe('ad source', () => {
  it('reads ?src= first, then utm_source, and utm_campaign', () => {
    expect(sourceFromSearch('?src=FB&utm_source=google&utm_campaign=Autumn Test')).toEqual({ src: 'fb', campaign: 'autumn-test' })
    expect(sourceFromSearch('?utm_source=Google.Ads')).toEqual({ src: 'google-ads', campaign: null })
    expect(sourceFromSearch('')).toEqual({ src: null, campaign: null })
  })

  it('keeps only short, plain tags and never an email', () => {
    expect(cleanTag('  Leaflet <Oct> 2026 ')).toBe('leaflet-oct-2026')
    expect(cleanTag('jo@example.com')).toBeNull()
    expect(cleanTag('07700900123')).toBeNull()
    expect(cleanTag('jo-bloggs-07700 900 123')).toBeNull()
    expect(cleanTag('+44 (0)7700-900123')).toBeNull()
    expect(cleanTag('oct-2026')).toBe('oct-2026')
    expect(cleanTag('x'.repeat(80))).toHaveLength(40)
    expect(cleanTag('!!!')).toBeNull()
    expect(cleanTag(42)).toBeNull()
  })

  it('carries the source on to the builder link', () => {
    expect(withSource('/build/', { src: 'fb', campaign: null })).toBe('/build/?src=fb')
    expect(withSource('/build/?trade=plumber', { src: 'fb', campaign: 'oct' })).toBe('/build/?trade=plumber&src=fb&utm_campaign=oct')
    expect(withSource('/build/', { src: null, campaign: null })).toBe('/build/')
  })
})
