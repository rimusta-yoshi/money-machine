import { hashString, outsideTheme, renderableSpec, SECTIONS, sectionSchemas } from '../gen'
import type { AnySpec, GeneratedSections, PageContent, SectionKey, SiteStyle } from '../gen'
import type { LegacyThemeKey } from '../gen'
import { tradeById } from '../trades'
import type { TradeId } from '../types'
import { LIMITS } from './limits'
import { pageContent } from './pageContent'
import { withRhythm } from './page'
import type { Site, SiteV1, SiteV2, SiteV3 } from './schema'
import { migrateTheme, styleRecord } from './style'

/** The theme each trade used before any theme could be picked. */
const V1_THEME: Record<TradeId, LegacyThemeKey> = {
  plumber: 'professional', electrician: 'professional', roofer: 'professional', painter: 'family', landscaper: 'family',
}

/**
 * v1 → v2. Deterministic: the style seed comes from the trade and business details, so
 * migrating the same record twice gives the same site. Hand-built template picks from v1
 * have no equivalent in the current generator, so sections start unpicked.
 */
export function migrateV1(v1: SiteV1): SiteV2 {
  const { hero: _hero, ...templates } = v1.selections
  void _hero
  return {
    tradeId: v1.tradeId,
    business: v1.business,
    brandColor: v1.brandColor,
    extras: v1.extras,
    content: v1.content,
    version: 2,
    style: { theme: V1_THEME[v1.tradeId], seed: hashString(`${v1.tradeId}|${v1.business.name}|${v1.business.phone}`), resolved: null },
    sections: {},
    selections: templates,
  }
}

const cut = (s: string, max: number) => s.slice(0, max)
const cutOrNull = (s: string | null, max: number) => (s === null ? null : cut(s, max) || null)

/**
 * v3 tightened text limits to what the layouts fit. Records aren't stored anywhere
 * permanent yet, so trimming here only affects local drafts.
 */
function clampToLimits(v2: SiteV2): Pick<Site, 'business' | 'content'> {
  const b = v2.business
  const c = v2.content
  const photo = <P extends { alt: string } | null>(p: P): P => (p ? { ...p, alt: cut(p.alt, LIMITS.photoAlt) } : p)
  return {
    business: {
      name: cut(b.name, LIMITS.name), phone: cut(b.phone, LIMITS.phone), location: cut(b.location, LIMITS.location),
      about: cut(b.about, LIMITS.about), yearsInBusiness: cut(b.yearsInBusiness, LIMITS.yearsInBusiness), email: b.email,
    },
    content: {
      ...c,
      badges: c.badges?.map(x => cut(x, LIMITS.badge)) ?? null,
      areas: c.areas?.map(x => cut(x, LIMITS.area)) ?? null,
      hours: c.hours?.map(h => ({ day: cut(h.day, LIMITS.hoursDay), time: cut(h.time, LIMITS.hoursTime) })) ?? null,
      jobsDone: cutOrNull(c.jobsDone, LIMITS.jobsDone),
      reviews: c.reviews?.map(r => ({ ...r, author: cut(r.author, LIMITS.reviewAuthor), location: cut(r.location, LIMITS.reviewLocation), text: cut(r.text, LIMITS.reviewText) })) ?? null,
      photos: { hero: photo(c.photos.hero), about: photo(c.photos.about), gallery: c.photos.gallery.map(photo) },
    },
  }
}

/** v2 → v3: text limits applied; the generated hero is carried over for v3 → v4 to re-check. */
export function migrateV2(v2: SiteV2): SiteV3 {
  return {
    version: 3,
    tradeId: v2.tradeId,
    brandColor: v2.brandColor,
    extras: v2.extras,
    style: v2.style,
    ...clampToLimits(v2),
    sections: v2.sections.hero ? { hero: v2.sections.hero } : {},
    rhythm: {},
  }
}

/**
 * A stored spec from before the biomes, if it still describes a layout the new theme can
 * draw with today's content: same archetype and params, at full size. Anything else is
 * dropped and the section starts unpicked.
 */
function upgradeSpec(type: SectionKey, raw: Record<string, unknown> | undefined, style: SiteStyle, content: PageContent): AnySpec | null {
  if (!raw) return null
  const parsed = sectionSchemas[type].safeParse({ ...raw, v: 2, step: 0 })
  if (!parsed.success) return null
  const spec = parsed.data as AnySpec
  if (renderableSpec(type, spec, content) !== spec) return null
  return outsideTheme(SECTIONS[type], spec, style) === null ? spec : null
}

/**
 * v3 → v4: themes become biomes. The old theme moves to the trade's new default (see
 * migrateTheme), the style is resolved again from the same seed, and each stored layout is
 * kept only if it still fits the new theme and content. The rhythm is solved again.
 */
export function migrateV3(v3: SiteV3): Site {
  const trade = tradeById[v3.tradeId]
  const style = styleRecord(migrateTheme(v3.tradeId, v3.style.theme), v3.brandColor, v3.style.seed)
  const content = pageContent(v3, trade)
  const sections: GeneratedSections = {}
  for (const [type, saved] of Object.entries(v3.sections) as [SectionKey, NonNullable<SiteV3['sections'][SectionKey]>][]) {
    const spec = upgradeSpec(type, saved.spec, style.resolved, content)
    if (!spec) continue
    const preferred = upgradeSpec(type, saved.preferred, style.resolved, content)
    Object.assign(sections, { [type]: preferred ? { seed: saved.seed, spec, preferred } : { seed: saved.seed, spec } })
  }
  return withRhythm({
    version: 4,
    tradeId: v3.tradeId,
    business: v3.business,
    brandColor: v3.brandColor,
    extras: v3.extras,
    content: v3.content,
    style,
    sections,
    rhythm: {},
  }, trade)
}
