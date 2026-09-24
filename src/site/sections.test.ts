import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { createSite } from './defaults'
import { siteSections } from './sections'

describe('siteSections', () => {
  it('leaves out the reviews section when the reviews extra is off', () => {
    const types = siteSections(plumber, createSite(plumber)).map(s => s.type)
    expect(types).not.toContain('testimonials')
    expect(types[0]).toBe('hero')
  })

  it('includes the reviews section when the extra is on, in trade order', () => {
    const site = { ...createSite(plumber), extras: ['reviews' as const] }
    const types = siteSections(plumber, site).map(s => s.type)
    expect(types).toEqual(plumber.sections.map(s => s.type))
  })
})
