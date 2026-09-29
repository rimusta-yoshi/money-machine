import type { SectionConfig, SectionType, TradeConfig } from '../types'
import type { ExtraId, Site } from './schema'

/** Sections that only appear when the customer has chosen the matching extra. */
const SECTION_EXTRA: Partial<Record<SectionType, ExtraId>> = {
  testimonials: 'reviews',
}

/** The trade's sections this site actually includes, in trade order, then the footer every site has. */
export function siteSections(trade: TradeConfig, site: Pick<Site, 'extras'>): SectionConfig[] {
  const own = trade.sections.filter(s => {
    const extra = SECTION_EXTRA[s.type]
    return s.type !== 'footer' && (!extra || site.extras.includes(extra))
  })
  return [...own, { type: 'footer' }]
}

/** Whether the customer has settled on a layout for this section. */
export function isPicked(site: Site, type: SectionType): boolean {
  return !!site.sections[type]
}
