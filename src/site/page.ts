import { resolvePage, rhythmOf } from '../gen'
import type { AnySpec, Measurer, ResolvedSection, SavedSections, SectionKey } from '../gen'
import type { TradeConfig } from '../types'
import { pageContent } from './pageContent'
import type { Site } from './schema'
import { siteSections } from './sections'

/** The site's sections in trade order (extras applied), footer last. */
export const pageOrder = (trade: TradeConfig, site: Pick<Site, 'extras'>): SectionKey[] =>
  siteSections(trade, site).map(s => s.type)

interface PageOpts {
  /** Specs to preview instead of the saved ones (the builder's carousel). */
  overrides?: Partial<Record<SectionKey, AnySpec>>
  measurer?: Measurer
}

type PageSite = Pick<Site, 'business' | 'content' | 'extras' | 'style' | 'sections'>

/** The whole page for a site: every present section's spec plus the solved rhythm. */
export function sitePage(site: PageSite, trade: TradeConfig, opts: PageOpts = {}): ResolvedSection[] {
  const content = pageContent(site, trade)
  return resolvePage({
    order: pageOrder(trade, site),
    saved: site.sections as SavedSections,
    content,
    style: site.style.resolved,
    styleSeed: site.style.seed,
    overrides: opts.overrides,
    measurer: opts.measurer,
  })
}

/**
 * Re-solves the rhythm for the whole page and saves it with the record, so publishing
 * renders exactly what the builder showed. Never touches the picks.
 */
export function withRhythm<S extends Site>(site: S, trade: TradeConfig): S {
  return { ...site, rhythm: rhythmOf(sitePage(site, trade)) }
}

/** The page as it will be published: saved picks, generator defaults, and the rhythm saved in the record. */
export function publishedPage(site: Site, trade: TradeConfig): ResolvedSection[] {
  return sitePage(site, trade).map(s => ({ ...s, rhythm: site.rhythm[s.type] ?? s.rhythm }))
}
