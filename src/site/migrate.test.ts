import { describe, expect, it } from 'vitest'
import { hashString, SECTIONS } from '../gen'
import type { SectionKey } from '../gen'
import { painter } from '../trades/painter'
import { plumber } from '../trades/plumber'
import type { TradeConfig } from '../types'
import { createSite } from './defaults'
import { LIMITS } from './limits'
import { migrateV1, migrateV2, migrateV3 } from './migrate'
import { withRhythm } from './page'
import { parseSite } from './parse'
import { siteSchema, siteSchemaV2, siteSchemaV3 } from './schema'
import type { SiteV1, SiteV2, SiteV3 } from './schema'
import { DEFAULT_THEME, styleRecord } from './style'

function v1(overrides: Partial<SiteV1> = {}, trade: TradeConfig = plumber): SiteV1 {
  const { tradeId, business, brandColor, extras, content } = createSite(trade, 1)
  return {
    tradeId, brandColor, extras, content,
    version: 1,
    business: { ...business, name: 'Joe Pipes', phone: '0113 496 0000' },
    selections: { hero: 'hero-split', contact: 'contact-simple', services: 'services-list' },
    ...overrides,
  }
}

const PHOTO = { url: 'https://example.com/hero.jpg', alt: 'Van outside a house' }
const withPhoto = <S extends SiteV1 | SiteV3>(site: S): S => ({ ...site, content: { ...site.content, photos: { ...site.content.photos, hero: PHOTO } } })

/** A stored spec as v3 saved it: the old `v: 1` shape, no step. */
type LegacySpec = Record<string, unknown>
const legacy = (type: SectionKey): LegacySpec => {
  const { v: _v, step: _step, ...rest } = SECTIONS[type].fallback
  void _v; void _step
  return { ...rest, v: 1 }
}
/** A v3 hero spec from the old generator: `stacked` had no `em` param then. */
const OLD_HERO: LegacySpec = { v: 1, section: 'hero', archetype: 'stacked', params: { align: 'center', image: 'none', tone: 'surface' } }

function v3(overrides: Partial<SiteV3> = {}, trade: TradeConfig = plumber): SiteV3 {
  const { version: _v, style: _s, sections: _sec, ...rest } = migrateV2(migrateV1(v1({}, trade)))
  void _v; void _s; void _sec
  return {
    ...rest,
    version: 3,
    style: { theme: trade.id === 'painter' ? 'family' : 'professional', seed: 1234, resolved: { anything: 'from the old generator' } },
    sections: {},
    rhythm: { hero: { band: 'ground', side: 'left' } },
    ...overrides,
  }
}

describe('migrateV1', () => {
  it('produces a valid v2 record', () => {
    const migrated = migrateV1(v1())
    expect(migrated.version).toBe(2)
    expect(() => siteSchemaV2.parse(migrated)).not.toThrow()
  })

  it('keeps business details, content and the other sections’ template picks', () => {
    const old = v1()
    const migrated = migrateV1(old)
    expect(migrated.business).toEqual(old.business)
    expect(migrated.content).toEqual(old.content)
    expect(migrated.selections).toEqual({ contact: 'contact-simple', services: 'services-list' })
  })

  it('leaves the hero unpicked, since the old hand-built heroes no longer exist', () => {
    expect(migrateV1(withPhoto(v1())).sections).toEqual({})
    expect(migrateV1(v1({ selections: { hero: 'hero-dark' } })).sections).toEqual({})
    expect(migrateV1(v1({ selections: {} })).sections).toEqual({})
  })

  it('gives the site its trade’s old theme and a style seed from the business details', () => {
    const migrated = migrateV1(v1({ brandColor: '#0F766E' }))
    expect(migrated.style.theme).toBe('professional')
    expect(migrateV1(v1({}, painter)).style.theme).toBe('family')
    expect(migrated.style.seed).toBe(hashString('plumber|Joe Pipes|0113 496 0000'))
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

describe('migrateV2', () => {
  const v2 = (overrides: Partial<SiteV2> = {}): SiteV2 => ({ ...migrateV1(withPhoto(v1())), ...overrides })

  it('produces a valid v3 record without the old template picks', () => {
    const migrated = migrateV2(v2())
    expect(migrated.version).toBe(3)
    expect(() => siteSchemaV3.parse(migrated)).not.toThrow()
    expect(migrated).not.toHaveProperty('selections')
  })

  it('carries a generated hero over unchanged, for v3 → v4 to re-check', () => {
    const old = v2({ sections: { hero: { seed: 5, spec: OLD_HERO } } })
    expect(migrateV2(old).sections).toEqual({ hero: { seed: 5, spec: OLD_HERO } })
    expect(migrateV2(v2()).sections).toEqual({})
  })

  it('keeps the theme and style seed', () => {
    const old = v2()
    expect(migrateV2(old).style).toEqual(old.style)
  })

  it('trims text to the new limits', () => {
    const old = v2({ business: { ...v2().business, location: 'x'.repeat(80), about: 'y'.repeat(160) } })
    const migrated = migrateV2(old)
    expect(migrated.business.location).toHaveLength(LIMITS.location)
    expect(migrated.business.about).toHaveLength(Math.min(160, LIMITS.about))
  })

  it('is deterministic and never mutates the v2 record', () => {
    const old = v2()
    const frozen = JSON.stringify(old)
    expect(JSON.stringify(migrateV2(old))).toBe(JSON.stringify(migrateV2(old)))
    expect(JSON.stringify(old)).toBe(frozen)
  })
})

describe('migrateV3', () => {
  it('produces a valid v4 record', () => {
    const migrated = migrateV3(v3({ sections: { hero: { seed: 1, spec: legacy('hero') } } }))
    expect(migrated.version).toBe(4)
    expect(siteSchema.parse(migrated)).toEqual(migrated)
  })

  it('moves a site on its trade’s old default theme to the trade’s new default', () => {
    expect(migrateV3(v3()).style.theme).toBe(DEFAULT_THEME.plumber)
    expect(migrateV3(v3({}, painter)).style.theme).toBe(DEFAULT_THEME.painter)
  })

  it('moves any other old theme to the nearest new look', () => {
    const style = (theme: SiteV3['style']['theme']) => migrateV3(v3({ style: { ...v3().style, theme } })).style.theme
    expect(style('luxury')).toBe('craft-heritage')
    expect(style('family')).toBe('friendly-local')
    expect(style('brutalism')).toBe('workwear')
  })

  it('resolves the style again from the same seed and brand colour', () => {
    const old = v3({ brandColor: '#0F766E' })
    const migrated = migrateV3(old)
    expect(migrated.style.seed).toBe(1234)
    expect(migrated.style).toEqual(styleRecord('clean-pro', '#0F766E', 1234))
    expect(migrated.style.resolved.palette.brand).toBe('#0F766E')
  })

  it('keeps business details and content', () => {
    const old = v3()
    const migrated = migrateV3(old)
    expect(migrated.business).toEqual(old.business)
    expect(migrated.content).toEqual(old.content)
    expect(migrated.extras).toEqual(old.extras)
  })

  it('keeps a stored spec that still parses and fits the new theme, at full size', () => {
    const migrated = migrateV3(v3({ sections: { hero: { seed: 9, spec: legacy('hero') }, contact: { seed: 3, spec: legacy('contact') } } }))
    expect(migrated.sections.hero).toEqual({ seed: 9, spec: { ...SECTIONS.hero.fallback, step: 0 } })
    expect(migrated.sections.contact).toEqual({ seed: 3, spec: { ...SECTIONS.contact.fallback, step: 0 } })
  })

  it('drops a stored spec that no longer parses, so the section starts unpicked', () => {
    const migrated = migrateV3(v3({ sections: { hero: { seed: 9, spec: OLD_HERO }, contact: { seed: 3, spec: legacy('contact') } } }))
    expect(migrated.sections.hero).toBeUndefined()
    expect(migrated.sections.contact).toBeDefined()
  })

  it('drops a stored spec whose layout the new theme doesn’t use', () => {
    // Editorial heroes are craft-heritage only: dropped for a plumber (clean-pro), kept for a painter.
    const editorial = { v: 1, section: 'hero', archetype: 'editorial', params: { image: 'none', motif: 'none', em: false } }
    expect(migrateV3(v3({ sections: { hero: { seed: 2, spec: editorial } } })).sections.hero).toBeUndefined()
    expect(migrateV3(v3({ sections: { hero: { seed: 2, spec: editorial } } }, painter)).sections.hero?.spec.archetype).toBe('editorial')
  })

  it('drops a stored spec whose content is missing', () => {
    // An overlay hero needs a photo.
    const overlay = { v: 1, section: 'hero', archetype: 'overlay', params: { anchor: 'bottom', scrim: 0.7, em: false } }
    expect(migrateV3(v3({ sections: { hero: { seed: 2, spec: overlay } } })).sections.hero).toBeUndefined()
    expect(migrateV3(withPhoto(v3({ sections: { hero: { seed: 2, spec: overlay } } }))).sections.hero?.spec.archetype).toBe('overlay')
  })

  it('keeps a remembered preference only if it can be upgraded too', () => {
    const kept = migrateV3(v3({ sections: { contact: { seed: 3, spec: legacy('contact'), preferred: legacy('contact') } } }))
    expect(kept.sections.contact?.preferred).toEqual({ ...SECTIONS.contact.fallback, step: 0 })
    const dropped = migrateV3(v3({ sections: { contact: { seed: 3, spec: legacy('contact'), preferred: { v: 1, section: 'contact', archetype: 'form', params: { fields: 4 } } } } }))
    expect(dropped.sections.contact?.spec).toEqual({ ...SECTIONS.contact.fallback, step: 0 })
    expect(dropped.sections.contact).not.toHaveProperty('preferred')
  })

  it('solves the page rhythm again for the new theme', () => {
    const migrated = migrateV3(v3({ sections: { hero: { seed: 9, spec: legacy('hero') } } }))
    expect(migrated.rhythm.hero).toBeDefined()
    expect(migrated.rhythm.hero).toHaveProperty('motif')
    expect(migrated.rhythm).toEqual(withRhythm(migrated, plumber).rhythm)
  })

  it('is deterministic and never mutates the v3 record', () => {
    const old = v3({ sections: { hero: { seed: 9, spec: legacy('hero') }, contact: { seed: 3, spec: OLD_HERO } } })
    const frozen = JSON.stringify(old)
    expect(JSON.stringify(migrateV3(old))).toBe(JSON.stringify(migrateV3(old)))
    expect(JSON.stringify(old)).toBe(frozen)
  })
})

describe('parseSite', () => {
  it('migrates stored v1 JSON all the way to v4 on the way in', () => {
    const old = withPhoto(v1())
    const parsed = parseSite(JSON.parse(JSON.stringify(old)))
    expect(parsed.version).toBe(4)
    expect(parsed.sections).toEqual({})
    expect(parsed.style.theme).toBe(DEFAULT_THEME.plumber)
    expect(parsed.business).toEqual(old.business)
    expect(parseSite(JSON.parse(JSON.stringify(old)))).toEqual(parsed)
  })

  it('migrates stored v2 JSON on the way in', () => {
    const parsed = parseSite(JSON.parse(JSON.stringify(migrateV1(v1({}, painter)))))
    expect(parsed.version).toBe(4)
    expect(parsed.style.theme).toBe(DEFAULT_THEME.painter)
  })

  it('migrates stored v3 JSON on the way in, keeping the specs that still fit', () => {
    const old = v3({ sections: { hero: { seed: 9, spec: OLD_HERO }, contact: { seed: 3, spec: legacy('contact') } } })
    const parsed = parseSite(JSON.parse(JSON.stringify(old)))
    expect(parsed.version).toBe(4)
    expect(Object.keys(parsed.sections)).toEqual(['contact'])
    expect(parsed).toEqual(migrateV3(old))
  })

  it('still validates older input before migrating it', () => {
    expect(() => parseSite({ ...v1(), brandColor: 'red' })).toThrow(/brandColor/)
    expect(() => parseSite({ ...v3(), style: { ...v3().style, theme: 'workwear' } })).toThrow(/style\.theme/)
  })

  it('rejects a stored spec with values outside the schema', () => {
    const site = createSite(plumber, 1)
    const bad = { ...site, sections: { hero: { seed: 1, spec: { v: 2, section: 'hero', archetype: 'overlay', step: 0, params: { anchor: 'center', scrim: 0.1, em: false } } } } }
    expect(() => parseSite(bad)).toThrow(/scrim/)
  })

  it('rejects a style that could inject CSS', () => {
    const site = createSite(plumber, 1)
    const { fonts } = site.style.resolved
    const bad = { ...site, style: { ...site.style, resolved: { ...site.style.resolved, fonts: { ...fonts, display: { ...fonts.display, family: 'x;background:url(evil)' } } } } }
    expect(() => parseSite(bad)).toThrow(/family/)
  })
})
