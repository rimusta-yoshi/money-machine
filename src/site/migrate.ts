import { hashString } from '../gen'
import type { HeroSpec } from '../gen'
import type { Site, SiteV1 } from './schema'
import { DEFAULT_THEME, firstHeroBatch, styleRecord } from './style'

/**
 * The closest generated hero to each v1 hand-built hero, so a migrated site keeps the
 * look the customer picked. Photo archetypes need a photo; without one we fall back
 * to photo-free archetypes.
 */
function legacyHero(variantId: string, hasPhoto: boolean): HeroSpec | null {
  if (variantId === 'hero-dark') {
    return hasPhoto
      ? { v: 1, section: 'hero', archetype: 'overlay', params: { anchor: 'middle-left', scrim: 0.7 } }
      : { v: 1, section: 'hero', archetype: 'typeled', params: { trust: false, scale: 1.2, tone: 'ground' } }
  }
  if (variantId === 'hero-split') {
    return hasPhoto
      ? { v: 1, section: 'hero', archetype: 'split', params: { ratio: 0.56, side: 'right', valign: 'center', proof: 'none', mobilePhoto: 'bottom', tone: 'ground' } }
      : { v: 1, section: 'hero', archetype: 'stacked', params: { align: 'left', image: 'none', tone: 'ground' } }
  }
  return null
}

/**
 * v1 → v2. Deterministic: the style seed comes from the trade and business details, so
 * migrating the same record twice gives the same site.
 */
export function migrateV1(v1: SiteV1): Site {
  const { hero: heroVariant, ...templates } = v1.selections
  const seed = hashString(`${v1.tradeId}|${v1.business.name}|${v1.business.phone}`)
  const spec = heroVariant ? legacyHero(heroVariant, v1.content.photos.hero !== null) : null
  return {
    tradeId: v1.tradeId,
    business: v1.business,
    brandColor: v1.brandColor,
    extras: v1.extras,
    content: v1.content,
    version: 2,
    style: styleRecord(DEFAULT_THEME[v1.tradeId], v1.brandColor, seed),
    sections: spec ? { hero: { seed: firstHeroBatch(seed), spec } } : {},
    selections: templates,
  }
}
