import { hashString, renderableSpec, sectionBatch as mixSeedsFor, sectionSchemas } from '../gen'
import type { AnySpec, GeneratedSections, HeroSpec, SectionKey } from '../gen'
import { tradeById } from '../trades'
import { LIMITS } from './limits'
import { pageContent } from './pageContent'
import { withRhythm } from './page'
import type { Site, SiteV1, SiteV2 } from './schema'
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
export function migrateV1(v1: SiteV1): SiteV2 {
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

/** The closest generated layout to each v2 hand-built template. */
const TEMPLATE_SPECS: Record<string, AnySpec> = {
  'trust-bar-scroll': { v: 1, section: 'trust_bar', archetype: 'strip', params: { align: 'center', divider: 'dot' } },
  'trust-grid': { v: 1, section: 'trust_bar', archetype: 'tiles', params: { style: 'card' } },
  'services-grid': { v: 1, section: 'services', archetype: 'cards', params: { cols: 3, style: 'filled', icons: true } },
  'services-list': { v: 1, section: 'services', archetype: 'list', params: { cols: 1 } },
  'about-photo': { v: 1, section: 'about', archetype: 'photo_split', params: { stats: true } },
  'why-features': { v: 1, section: 'why_us', archetype: 'rows', params: { icons: true } },
  'gallery-masonry': { v: 1, section: 'gallery', archetype: 'mosaic', params: { wide: 'first' } },
  'gallery-row': { v: 1, section: 'gallery', archetype: 'strip', params: { size: 'medium' } },
  'certs-prominent': { v: 1, section: 'certifications', archetype: 'cards', params: { cols: 3, mark: 'badge' } },
  'certs-badges': { v: 1, section: 'certifications', archetype: 'seals', params: { shape: 'circle', align: 'center' } },
  'reviews-carousel': { v: 1, section: 'testimonials', archetype: 'scroll', params: { style: 'card' } },
  'areas-grid': { v: 1, section: 'areas', archetype: 'chips', params: { align: 'left' } },
  'contact-full': { v: 1, section: 'contact', archetype: 'details', params: { style: 'card' } },
  'contact-simple': { v: 1, section: 'contact', archetype: 'band', params: { align: 'left' } },
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

/**
 * v2 → v3: every section becomes generated. Template picks map to their closest layout,
 * kept only if the site's content still allows it (otherwise the section starts unpicked
 * and gets the generator's default). The rhythm is solved for the migrated page.
 */
export function migrateV2(v2: SiteV2): Site {
  const trade = tradeById[v2.tradeId]
  const clamped = clampToLimits(v2)
  const content = pageContent({ ...clamped, extras: v2.extras }, trade)
  const sections: GeneratedSections = { ...(v2.sections.hero ? { hero: v2.sections.hero } : {}) }
  for (const [type, variantId] of Object.entries(v2.selections)) {
    const spec = TEMPLATE_SPECS[variantId]
    if (!spec || spec.section !== type) continue
    const key = type as Exclude<SectionKey, 'hero' | 'footer'>
    if (renderableSpec(key, spec, content) !== spec) continue
    const parsed = sectionSchemas[key].safeParse(spec)
    if (parsed.success) Object.assign(sections, { [key]: { seed: mixSeedsFor(v2.style.seed, key), spec: parsed.data } })
  }
  return withRhythm({
    version: 3,
    tradeId: v2.tradeId,
    brandColor: v2.brandColor,
    extras: v2.extras,
    style: v2.style,
    ...clamped,
    sections,
    rhythm: {},
  }, trade)
}
