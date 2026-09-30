import type { Generated, SectionKey, ThemeKey } from '../gen'
import type { BusinessInfo, TradeConfig } from '../types'
import { tradeById } from '../trades'
import { createSite } from './defaults'
import { withRhythm } from './page'
import type { ExtraId, Site, SiteContent } from './schema'
import { styleRecord } from './style'

export type SiteAction =
  | { type: 'pickTrade'; trade: TradeConfig }
  | { type: 'setBusiness'; patch: Partial<BusinessInfo> }
  | { type: 'setBrandColor'; color: string }
  | { type: 'toggleExtra'; extra: ExtraId }
  | { type: 'setTheme'; theme: ThemeKey }
  /** "Re-roll site style": the same theme and brand colour, a new style seed. The seed comes in so the reducer stays pure. */
  | { type: 'rerollStyle'; seed: number }
  /** The customer picked a layout: it replaces any earlier pick and any remembered preference. */
  | { type: 'pickSection'; section: SectionKey; value: Generated }
  /** Fit repair swapped (or restored) a layout; `value.preferred` keeps the customer's own pick. */
  | { type: 'repairSection'; section: SectionKey; value: Generated }
  | { type: 'setContent'; patch: Partial<SiteContent> }
  | { type: 'reset' }

/**
 * All builder edits to the site record. null = no trade picked yet. After every edit the
 * page rhythm is re-solved from the whole page; picks are never changed by it.
 */
export function siteReducer(site: Site | null, action: SiteAction): Site | null {
  const next = edit(site, action)
  return next && next !== site ? withRhythm(next, tradeById[next.tradeId]) : next
}

function edit(site: Site | null, action: SiteAction): Site | null {
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
      if (action.theme === site.style.theme) return site
      return { ...site, style: styleRecord(action.theme, site.brandColor, site.style.seed) }
    case 'rerollStyle':
      return { ...site, style: styleRecord(site.style.theme, site.brandColor, action.seed) }
    case 'toggleExtra':
      return {
        ...site,
        extras: site.extras.includes(action.extra)
          ? site.extras.filter(e => e !== action.extra)
          : [...site.extras, action.extra],
      }
    case 'pickSection':
      return { ...site, sections: { ...site.sections, [action.section]: { seed: action.value.seed, spec: action.value.spec } } }
    case 'repairSection':
      return { ...site, sections: { ...site.sections, [action.section]: action.value } }
    case 'setContent':
      return { ...site, content: { ...site.content, ...action.patch } }
  }
}
