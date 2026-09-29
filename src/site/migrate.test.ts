import { describe, expect, it } from 'vitest'
import { plumber } from '../trades/plumber'
import { createSite } from './defaults'
import { migrateV1, migrateV2 } from './migrate'
import { parseSite } from './parse'
import { siteSchema, siteSchemaV2 } from './schema'
import type { SiteV1, SiteV2 } from './schema'
import { LIMITS } from './limits'
import { withRhythm } from './page'

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
    expect(() => siteSchemaV2.parse(migrated)).not.toThrow()
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
  it('migrates stored v1 JSON all the way to v3 on the way in', () => {
    const parsed = parseSite(JSON.parse(JSON.stringify(withPhoto(v1()))))
    expect(parsed.version).toBe(3)
    expect(parsed.sections.hero?.spec.archetype).toBe('split')
    expect(parsed.sections.contact?.spec).toEqual({ v: 1, section: 'contact', archetype: 'band', params: { align: 'left' } })
    expect(parsed.sections.services?.spec.archetype).toBe('list')
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

describe('migrateV2', () => {
  const v2 = (overrides: Partial<SiteV2> = {}): SiteV2 => ({ ...migrateV1(withPhoto(v1())), ...overrides })

  it('produces a valid v3 record with every template pick mapped to a generated layout', () => {
    const migrated = migrateV2(v2())
    expect(migrated.version).toBe(3)
    expect(() => siteSchema.parse(migrated)).not.toThrow()
    expect(Object.keys(migrated.sections).sort()).toEqual(['contact', 'hero', 'services'])
    expect(migrated).not.toHaveProperty('selections')
  })

  it('keeps the migrated hero exactly as it was', () => {
    const old = v2()
    expect(migrateV2(old).sections.hero).toEqual(old.sections.hero)
  })

  it('drops a mapped layout whose content is missing, so the section starts unpicked', () => {
    // The old gallery grid needs 3+ photos; this site has none.
    const migrated = migrateV2(v2({ selections: { gallery: 'gallery-masonry' } }))
    expect(migrated.sections.gallery).toBeUndefined()
  })

  it('solves and saves the page rhythm', () => {
    const migrated = migrateV2(v2())
    expect(migrated.rhythm.hero).toBeDefined()
    expect(migrated.rhythm).toEqual(withRhythm(migrated, plumber).rhythm)
  })

  it('trims text to the new limits', () => {
    const old = v2({ business: { ...v2().business, location: 'x'.repeat(60), about: 'y'.repeat(160) } })
    const migrated = migrateV2(old)
    expect(migrated.business.location).toHaveLength(LIMITS.location)
    expect(migrated.business.about).toHaveLength(160)
  })

  it('is deterministic and never mutates the v2 record', () => {
    const old = v2()
    const frozen = JSON.stringify(old)
    expect(JSON.stringify(migrateV2(old))).toBe(JSON.stringify(migrateV2(old)))
    expect(JSON.stringify(old)).toBe(frozen)
  })

  it('migrates stored v2 JSON on the way in', () => {
    expect(parseSite(JSON.parse(JSON.stringify(v2()))).version).toBe(3)
  })
})
