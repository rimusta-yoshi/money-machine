import { BASE_CSS } from './core/css'
import { estimateMeasurer } from './core/estimate'
import { defaultSpec, isPresent, staticChecksAll } from './core/pipeline'
import { solveRhythm } from './core/rhythm'
import type { Rhythm } from './core/rhythm'
import type { AnySpec, Band, Generated, Measurer, SectionDef, SectionKey, SectionRhythm } from './core/types'
import type { PageContent } from './content'
import { HERO_CSS } from './hero/css'
import { hashString, mixSeeds } from './rng'
import type { SiteStyle } from './schema'
import { THEME_CSS } from './themes'
import { about, ABOUT_CSS } from './sections/about'
import { areas, AREAS_CSS } from './sections/areas'
import { certifications, CERTIFICATIONS_CSS } from './sections/certifications'
import { contact, CONTACT_CSS } from './sections/contact'
import { footer, FOOTER_CSS } from './sections/footer'
import { gallery, GALLERY_CSS } from './sections/gallery'
import { PAGE_CSS, renderHeader } from './sections/header'
import { hero } from './sections/hero'
import { services, SERVICES_CSS } from './sections/services'
import { testimonials, TESTIMONIALS_CSS } from './sections/testimonials'
import { trustBar, TRUST_BAR_CSS } from './sections/trustBar'
import { whyUs, WHY_US_CSS } from './sections/whyUs'

/** Every section definition, by type. */
export const SECTIONS = {
  hero,
  trust_bar: trustBar,
  services,
  about,
  why_us: whyUs,
  gallery,
  certifications,
  testimonials,
  areas,
  contact,
  footer,
} as unknown as Record<SectionKey, SectionDef>

/** Everything a generated page needs. Include once per page. */
export const GEN_CSS = [PAGE_CSS, BASE_CSS, HERO_CSS, TRUST_BAR_CSS, SERVICES_CSS, ABOUT_CSS, WHY_US_CSS, GALLERY_CSS, CERTIFICATIONS_CSS, TESTIMONIALS_CSS, AREAS_CSS, CONTACT_CSS, FOOTER_CSS, THEME_CSS].join('\n')

/** A section's first batch seed, derived from the site's style seed (the hero's matches firstHeroBatch). */
export const sectionBatch = (styleSeed: number, type: SectionKey): number => mixSeeds(styleSeed, hashString(type))

/** The content slice a section reads. */
export const viewOf = (type: SectionKey, content: PageContent): unknown => SECTIONS[type].view(content)

/** Whether a section has what it needs to appear. Hero and footer always do. */
export const sectionPresent = (type: SectionKey, content: PageContent): boolean => isPresent(SECTIONS[type], viewOf(type, content))

/** The site's sections in the given (trade) order, keeping only those whose content allows a layout. */
export function presentSections(order: readonly SectionKey[], content: PageContent): SectionKey[] {
  return order.filter(t => sectionPresent(t, content))
}

/**
 * The spec actually rendered: the saved one, or the fallback if its content gate no longer
 * holds (fit repair usually swaps it first in the builder; this is the safety net).
 */
export function renderableSpec(type: SectionKey, spec: AnySpec, content: PageContent): AnySpec {
  const def = SECTIONS[type]
  const archetype = def.archetypes[spec.archetype]
  return archetype && archetype.gate(viewOf(type, content) as never) ? spec : def.fallback
}

export interface ResolvedSection {
  type: SectionKey
  seed: number
  spec: AnySpec
  /** Whether the customer chose this (false = the generator's default). */
  picked: boolean
  rhythm: SectionRhythm
}

export type SavedSections = Partial<Record<SectionKey, Generated>>

export interface ResolveOptions {
  order: readonly SectionKey[]
  saved: SavedSections
  content: PageContent
  style: SiteStyle
  styleSeed: number
  /** Specs to use instead of the saved ones, e.g. the option being previewed in the builder. */
  overrides?: Partial<Record<SectionKey, AnySpec>>
  measurer?: Measurer
}

/**
 * The whole page, ready to render or publish: every present section's spec (picked, or
 * the generator's default under the estimator) plus the rhythm solved across all of them.
 */
export function resolvePage(o: ResolveOptions): ResolvedSection[] {
  const measurer = o.measurer ?? estimateMeasurer
  const entries = presentSections(o.order, o.content).map(type => {
    const def = SECTIONS[type]
    const saved = o.saved[type]
    const seed = saved?.seed ?? sectionBatch(o.styleSeed, type)
    const chosen = o.overrides?.[type] ?? saved?.spec ?? defaultSpec(def, seed, viewOf(type, o.content), o.style, measurer)
    return { type, seed, spec: renderableSpec(type, chosen, o.content), picked: !!saved }
  })
  const rhythm = solveRhythm(entries, SECTIONS, o.style)
  return entries.map(e => ({ ...e, rhythm: rhythm[e.type]! }))
}

export const rhythmOf = (page: readonly ResolvedSection[]): Rhythm =>
  Object.fromEntries(page.map(s => [s.type, s.rhythm])) as Rhythm

/**
 * One section's HTML. If its spec fails contrast on the band it was given, the section's
 * safe layout is used; if even that fails there (e.g. a stale brand band), it drops to ground.
 */
export function renderPageSection(s: Pick<ResolvedSection, 'type' | 'spec' | 'rhythm'>, style: SiteStyle, content: PageContent): string {
  const def = SECTIONS[s.type]
  // Only a layout that owns its photo band may use it; anything else gets its own band or ground.
  const bandFor = (spec: AnySpec): Band => {
    const own = def.fixedBand?.(spec) ?? null
    return s.rhythm.band === 'photo' && own !== 'photo' ? own ?? 'ground' : s.rhythm.band
  }
  const passes = (spec: AnySpec) => staticChecksAll(def, spec, style, [bandFor(spec)]).every(c => c.ok)
  const view = viewOf(s.type, content)
  if (passes(s.spec)) return def.render(s.spec, style, view, { ...s.rhythm, band: bandFor(s.spec) })
  if (passes(def.fallback)) return def.render(def.fallback, style, view, { ...s.rhythm, band: bandFor(def.fallback) })
  return def.render(def.fallback, style, view, { ...s.rhythm, band: 'ground', motif: false })
}

export interface RenderPageOptions {
  /** Allow builder-only sample content (the contact sheet and dev previews). Publishing never sets this. */
  preview?: boolean
}

/** The full page body: skip link, header, main content and footer. Refuses sample content unless previewing. */
export function renderPage(page: readonly ResolvedSection[], style: SiteStyle, content: PageContent, opts: RenderPageOptions = {}): string {
  if (content.sample && !opts.preview) throw new Error('Sample content is for previews only and can never be published')
  const main = page.filter(s => s.type !== 'footer').map(s => renderPageSection(s, style, content)).join('')
  const foot = page.find(s => s.type === 'footer')
  const header = renderHeader(style, content, page.map(s => s.type))
  return `<a class="sb-skip" href="#main">Skip to main content</a>${header}<main id="main" tabindex="-1">${main}</main>${foot ? renderPageSection(foot, style, content) : ''}`
}
