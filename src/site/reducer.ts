import type { GeneratedHero, ThemeKey } from '../gen'
import type { BusinessInfo, SectionType, TradeConfig } from '../types'
import { createSite } from './defaults'
import type { ExtraId, Site, SiteContent } from './schema'
import { styleRecord } from './style'

type TemplateSection = Exclude<SectionType, 'hero'>

export type SiteAction =
  | { type: 'pickTrade'; trade: TradeConfig }
  | { type: 'setBusiness'; patch: Partial<BusinessInfo> }
  | { type: 'setBrandColor'; color: string }
  | { type: 'toggleExtra'; extra: ExtraId }
  | { type: 'setTheme'; theme: ThemeKey }
  | { type: 'select'; section: TemplateSection; variantId: string }
  | { type: 'pickGenerated'; section: 'hero'; value: GeneratedHero }
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
      if (!/^#[0-9a-fA-F]{6}$/.test(action.color)) return site
      return { ...site, brandColor: action.color, style: styleRecord(site.style.theme, action.color, site.style.seed) }
    case 'setTheme':
      return { ...site, style: styleRecord(action.theme, site.brandColor, site.style.seed) }
    case 'toggleExtra':
      return {
        ...site,
        extras: site.extras.includes(action.extra)
          ? site.extras.filter(e => e !== action.extra)
          : [...site.extras, action.extra],
      }
    case 'select':
      return { ...site, selections: { ...site.selections, [action.section]: action.variantId } }
    case 'pickGenerated':
      return { ...site, sections: { ...site.sections, [action.section]: action.value } }
    case 'setContent':
      return { ...site, content: { ...site.content, ...action.patch } }
  }
}
