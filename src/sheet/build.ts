import {
  facts, generateOptions, renderPage, resolvePage, resolveSiteStyle, sectionBatch, SECTION_KEYS, SECTIONS, THEMES, viewOf,
} from '../gen'
import type { AnySpec, Candidate, Measurer, PageContent, SectionKey, SiteStyle, ThemeKey } from '../gen'
import { esc } from '../gen/html'
import { withSample } from '../sample/content'
import type { TradeConfig } from '../types'

/** The mockups' own brand colours, so each theme is first seen as designed. */
export const THEME_BRANDS: Record<ThemeKey, string> = {
  'workwear': '#FFD400',
  'clean-pro': '#1F4FD8',
  'craft-heritage': '#1E4D3A',
  'friendly-local': '#0B6E6D',
}

/** A trade's page content with nothing filled in yet, as a brand-new site would have. */
export function tradeContent(trade: TradeConfig, year = 2026): PageContent {
  return {
    trade: { name: trade.name, tagline: trade.tagline, ctaText: trade.ctaText, ctaSubtext: trade.ctaSubtext, services: trade.services },
    business: { name: '', phone: '', tel: null, email: '', location: '', about: '', years: '' },
    badges: [], areas: [], hours: [], emergency: false, jobsDone: null, rating: null, reviews: [],
    photos: { hero: null, about: null, gallery: [] },
    quoteForm: false,
    year,
  }
}

export const sampleFor = (trade: TradeConfig, photos: PageContent['photos']['gallery']): PageContent =>
  withSample(tradeContent(trade), photos)

let uid = 0
/** Ids made unique per rendered copy, so a sheet full of sections stays a valid document. */
export function uniqueIds(html: string): string {
  const n = ++uid
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]))
  return html
    .replace(/\s(id|for)="([^"]+)"/g, (_m, a, v) => ` ${a}="${v}--${n}"`)
    .replace(/\saria-labelledby="([^"]+)"/g, (_m, v) => ` aria-labelledby="${v}--${n}"`)
    .replace(/\shref="#([^"]+)"/g, (m, v) => (ids.has(v) ? ` href="#${v}--${n}"` : m))
}

export interface OptionRow { type: SectionKey; candidate: Candidate<AnySpec>; html: string }

/** One section's shown options for a theme, rendered on their natural band. */
export function sectionOptions(type: SectionKey, style: SiteStyle, content: PageContent, measurer: Measurer, batchSeed: number, show = 6): OptionRow[] {
  const def = SECTIONS[type]
  const view = viewOf(type, content)
  const { shown } = generateOptions(def, { batchSeed, content: view, style, measurer, show })
  return shown.map(candidate => {
    const band = def.fixedBand?.(candidate.spec as never) ?? 'ground'
    return { type, candidate, html: uniqueIds(def.render(candidate.spec, style, view, { band, side: 'right', motif: true })) }
  })
}

/** A whole sample page: every section, the generator's first pick each, with the rhythm solved. */
export function samplePage(style: SiteStyle, styleSeed: number, content: PageContent, measurer: Measurer): string {
  const page = resolvePage({ order: SECTION_KEYS, saved: {}, content, style, styleSeed, measurer })
  return uniqueIds(renderPage(page, style, content, { preview: true }))
}

export const styleSummary = (style: SiteStyle): string => {
  const t = THEMES[style.theme]
  const p = style.palette
  const chip = (c: string) => `<span class="sw" style="background:${esc(c)}"></span>`
  return `${esc(t.scales[style.scale].label)} type · ${esc(style.button)} buttons · radius ${style.radius} · ${chip(p.ground)}${chip(p.surface)}${chip(p.ink)}${chip(p.brandFill)}${chip(p.brandText)}${p.tints.map(chip).join('')}`
}

export const batchFor = (styleSeed: number, type: SectionKey): number => sectionBatch(styleSeed, type)
export { facts, resolveSiteStyle }
