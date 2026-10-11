import type { Generated, SectionKey, ThemeKey } from '../gen'
import type { BusinessInfo, TradeConfig } from '../types'
import { tradeById } from '../trades'
import { createSite } from './defaults'
import { withRhythm } from './page'
import type { ExtraId, Site, SiteContent } from './schema'
import { styleRecord } from './style'
import { defaultEntry, lockedEntry } from './locks'
import { siteSections } from './sections'

export type SiteAction =
  | { type: 'pickTrade'; trade: TradeConfig }
  | { type: 'setBusiness'; patch: Partial<BusinessInfo> }
  | { type: 'setBrandColor'; color: string }
  | { type: 'toggleExtra'; extra: ExtraId }
  | { type: 'setTheme'; theme: ThemeKey }
  /** "Re-roll site style": the same theme and brand colour, a new style seed. The seed comes in so the reducer stays pure. */
  | { type: 'rerollStyle'; seed: number }
  /** The customer picked a layout: it replaces any earlier pick and any remembered preference, and is locked. */
  | { type: 'pickSection'; section: SectionKey; value: Generated }
  /** The builder chose a layout for a section the customer never visited (before going live). Not locked. */
  | { type: 'acceptSection'; section: SectionKey; value: Generated }
  /** Fit repair swapped (or restored) a layout; `value.preferred` keeps the customer's own pick. */
  | { type: 'repairSection'; section: SectionKey; value: Generated }
  | { type: 'setContent'; patch: Partial<SiteContent> }
  /** Photos went up to storage on save: swap each uploaded data URL for its stored URL (later edits are kept). */
  | { type: 'replacePhotoUrls'; urls: Readonly<Record<string, string>> }
  /** A saved draft was opened (resume link or this browser's last draft). Taken as saved. */
  | { type: 'load'; site: Site }
  | { type: 'reset' }

/**
 * All builder edits to the site record. null = no trade picked yet. After every edit the
 * page rhythm is re-solved from the whole page; picks are never changed by it.
 */
export function siteReducer(site: Site | null, action: SiteAction): Site | null {
  if (action.type === 'load') return action.site
  const next = edit(site, action)
  if (!next || next === site) return next
  // A new look starts the rhythm afresh; any other edit keeps settled sections' loud bands.
  const fresh = action.type === 'setTheme' || action.type === 'rerollStyle' || action.type === 'pickTrade'
  const changed = action.type === 'pickSection' || action.type === 'acceptSection' || action.type === 'repairSection' ? action.section : undefined
  return withRhythm(next, tradeById[next.tradeId], fresh ? { prior: null } : { changed })
}

/**
 * A new trade starts from that trade's defaults, except for everything the customer chose:
 * business details, extras, content, a locked colour and style, and locked layouts for
 * sections the new trade's page also has.
 */
function switchTrade(site: Site, fresh: Site, trade: TradeConfig): Site {
  const locks = site.locks ?? {}
  const brandColor = locks.brandColor ? site.brandColor : fresh.brandColor
  const theme = locks.theme ? site.style.theme : fresh.style.theme
  const onPage = new Set(siteSections(trade, site).map(s => s.type))
  const sections = Object.fromEntries(Object.entries(site.sections).filter(([type, entry]) => entry?.locked && onPage.has(type as SectionKey)))
  return {
    ...fresh,
    business: site.business,
    extras: site.extras,
    content: site.content,
    brandColor,
    style: styleRecord(theme, brandColor, site.style.seed),
    sections,
    locks,
  }
}

const swapUrl = (urls: Readonly<Record<string, string>>) => <P extends { url: string } | null>(p: P): P =>
  p && urls[p.url] ? { ...p, url: urls[p.url] } : p

function edit(site: Site | null, action: Exclude<SiteAction, { type: 'load' }>): Site | null {
  if (action.type === 'reset') return null
  if (action.type === 'pickTrade') {
    if (site?.tradeId === action.trade.id) return site
    const fresh = createSite(action.trade)
    return site ? switchTrade(site, fresh, action.trade) : fresh
  }
  if (!site) return null

  switch (action.type) {
    case 'setBusiness':
      return { ...site, business: { ...site.business, ...action.patch } }
    case 'setBrandColor':
      if (!/^#[0-9a-fA-F]{6}$/.test(action.color)) return site
      return { ...site, brandColor: action.color, style: styleRecord(site.style.theme, action.color, site.style.seed), locks: { ...site.locks, brandColor: true } }
    case 'setTheme':
      if (action.theme === site.style.theme) return site
      return { ...site, style: styleRecord(action.theme, site.brandColor, site.style.seed), locks: { ...site.locks, theme: true } }
    case 'rerollStyle':
      // Shuffling is choosing this style too.
      return { ...site, style: styleRecord(site.style.theme, site.brandColor, action.seed), locks: { ...site.locks, theme: true } }
    case 'toggleExtra':
      return {
        ...site,
        extras: site.extras.includes(action.extra)
          ? site.extras.filter(e => e !== action.extra)
          : [...site.extras, action.extra],
      }
    case 'pickSection':
      return { ...site, sections: { ...site.sections, [action.section]: lockedEntry(action.value) } }
    case 'acceptSection':
      return { ...site, sections: { ...site.sections, [action.section]: defaultEntry(action.value) } }
    case 'repairSection': {
      // A repair swaps what's shown, never whose choice it was: the customer's pick stays locked (as `preferred`).
      const locked = (site.sections[action.section] as Generated | undefined)?.locked
      return { ...site, sections: { ...site.sections, [action.section]: locked ? { ...action.value, locked } : action.value } }
    }
    case 'setContent':
      return { ...site, content: { ...site.content, ...action.patch } }
    case 'replacePhotoUrls': {
      const swap = swapUrl(action.urls)
      const p = site.content.photos
      return { ...site, content: { ...site.content, photos: { hero: swap(p.hero), about: swap(p.about), gallery: p.gallery.map(swap) } } }
    }
  }
}
