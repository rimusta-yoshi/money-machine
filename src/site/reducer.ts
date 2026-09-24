import type { BusinessInfo, SectionType, TradeConfig } from '../types'
import { createSite } from './defaults'
import type { ExtraId, Site, SiteContent } from './schema'

export type SiteAction =
  | { type: 'pickTrade'; trade: TradeConfig }
  | { type: 'setBusiness'; patch: Partial<BusinessInfo> }
  | { type: 'setBrandColor'; color: string }
  | { type: 'toggleExtra'; extra: ExtraId }
  | { type: 'select'; section: SectionType; variantId: string }
  | { type: 'setContent'; patch: Partial<SiteContent> }
  | { type: 'reset' }

/** All builder edits to the site record. null = no trade picked yet. */
export function siteReducer(site: Site | null, action: SiteAction): Site | null {
  if (action.type === 'reset') return null
  if (action.type === 'pickTrade') {
    if (site?.tradeId === action.trade.id) return site
    const fresh = createSite(action.trade)
    // Business details are about the person, not the trade, so they survive a switch.
    return site ? { ...fresh, business: site.business, extras: site.extras } : fresh
  }
  if (!site) return null

  switch (action.type) {
    case 'setBusiness':
      return { ...site, business: { ...site.business, ...action.patch } }
    case 'setBrandColor':
      return { ...site, brandColor: action.color }
    case 'toggleExtra':
      return {
        ...site,
        extras: site.extras.includes(action.extra)
          ? site.extras.filter(e => e !== action.extra)
          : [...site.extras, action.extra],
      }
    case 'select':
      return { ...site, selections: { ...site.selections, [action.section]: action.variantId } }
    case 'setContent':
      return { ...site, content: { ...site.content, ...action.patch } }
  }
}
