import type { SectionConfig, SectionType, TradeConfig } from '../types'
import type { ExtraId, Site } from './schema'

/** Sections that only appear when the customer has chosen the matching extra. */
const SECTION_EXTRA: Partial<Record<SectionType, ExtraId>> = {
  testimonials: 'reviews',
}

/** The trade's sections this site actually includes, in trade order. */
export function siteSections(trade: TradeConfig, site: Site): SectionConfig[] {
  return trade.sections.filter(s => {
    const extra = SECTION_EXTRA[s.type]
    return !extra || site.extras.includes(extra)
  })
}
