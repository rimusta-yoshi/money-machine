import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { createSite } from './defaults'
import { migrateV1 } from './migrate'
import { parseSite } from './parse'
import { siteSchema } from './schema'
import type { SiteV1 } from './schema'

function v1(overrides: Partial<SiteV1> = {}): SiteV1 {
  const { tradeId, business, brandColor, extras, content } = createSite(plumber, 1)
  const rest = { tradeId, business, brandColor, extras, content }
  return {
    ...rest,
    version: 1,
    business: { ...rest.business, name: 'Joe Pipes', phone: '0113 496 0000' },
    selections: { hero: 'hero-split', contact: 'contact-simple', services: 'services-list' },
    ...overrides,
  }
}

const PHOTO = { url: 'https://example.com/hero.jpg', alt: 'Van outside a house' }
const withPhoto = (site: SiteV1): SiteV1 => ({ ...site, content: { ...site.content, photos: { ...site.content.photos, hero: PHOTO } } })

describe('migrateV1', () => {
  it('produces a valid v2 record', () => {
    const migrated = migrateV1(v1())
    expect(migrated.version).toBe(2)
    expect(() => siteSchema.parse(migrated)).not.toThrow()
  })

  it('keeps business details, content and the other sections’ layouts', () => {
    const old = v1()
    const migrated = migrateV1(old)
    expect(migrated.business).toEqual(old.business)
    expect(migrated.content).toEqual(old.content)
    expect(migrated.selections).toEqual({ contact: 'contact-simple', services: 'services-list' })
  })

  it('maps the old heroes onto the closest generated archetype', () => {
    expect(migrateV1(withPhoto(v1())).sections.hero?.spec.archetype).toBe('split')
    expect(migrateV1(v1()).sections.hero?.spec.archetype).toBe('stacked')
    expect(migrateV1(withPhoto(v1({ selections: { hero: 'hero-dark' } }))).sections.hero?.spec.archetype).toBe('overlay')
    expect(migrateV1(v1({ selections: { hero: 'hero-dark' } })).sections.hero?.spec.archetype).toBe('typeled')
  })

  it('leaves the hero unpicked if none was picked before', () => {
    expect(migrateV1(v1({ selections: {} })).sections).toEqual({})
  })

  it('resolves a style from the trade theme and the brand colour', () => {
    const migrated = migrateV1(v1({ brandColor: '#0F766E' }))
    expect(migrated.style.theme).toBe('professional')
    expect(migrated.style.resolved.palette.brand).toBe('#0F766E')
  })

  it('is deterministic', () => {
    expect(migrateV1(v1())).toEqual(migrateV1(v1()))
  })

  it('never mutates the v1 record', () => {
    const old = v1()
    const frozen = JSON.stringify(old)
    migrateV1(old)
    expect(JSON.stringify(old)).toBe(frozen)
  })
})

describe('parseSite', () => {
  it('migrates stored v1 JSON on the way in', () => {
    const parsed = parseSite(JSON.parse(JSON.stringify(withPhoto(v1()))))
    expect(parsed.version).toBe(2)
    expect(parsed.sections.hero?.spec.archetype).toBe('split')
  })

  it('still validates v1 input before migrating it', () => {
    expect(() => parseSite({ ...v1(), brandColor: 'red' })).toThrow(/brandColor/)
  })

  it('rejects a stored spec with values outside the schema', () => {
    const site = migrateV1(withPhoto(v1()))
    const bad = { ...site, sections: { hero: { seed: 1, spec: { v: 1, section: 'hero', archetype: 'overlay', params: { anchor: 'center', scrim: 0.1 } } } } }
    expect(() => parseSite(bad)).toThrow(/scrim/)
  })

  it('rejects a style that could inject CSS', () => {
    const site = migrateV1(v1())
    const bad = { ...site, style: { ...site.style, resolved: { ...site.style.resolved, display: { family: 'x;background:url(evil)', weight: 800, fallback: 'serif' } } } }
    expect(() => parseSite(bad)).toThrow()
  })
})
