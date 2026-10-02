import { fontFaceCss, GEN_CSS, renderHeader, renderPage, renderPageSection } from '../gen'
import type { PageContent } from '../gen'
import { esc } from '../gen/html'
import { FEATURES } from '../site/features'
import { publishedPage } from '../site/page'
import { pageContent } from '../site/pageContent'
import type { Site } from '../site/schema'
import type { TradeConfig } from '../types'
import { faviconSvg, headTags, pageDescription, pageTitle } from './meta'
import type { PageMeta } from './meta'
import { PRIVACY_PATH } from './paths'
import { PRIVACY_CSS, privacySection } from './privacy'

/**
 * Whole HTML documents for a site, from its saved record and the shared generator: no DOM,
 * no measuring. The same code renders preview links and published pages; only the options
 * differ. Everything the customer typed goes through the generator's escaping.
 */
export interface DocumentOptions {
  /** Where the site is served, without a trailing slash, e.g. https://joes-plumbing.siteblocks.co.uk */
  origin: string
  /** The site's path on that origin: '' when published, '/<token>' for a preview link. */
  base: string
  /** The stylesheet from siteCss(), as linked from the page. */
  cssHref: string
  /** Staging: ask search engines to stay away. */
  noindex: boolean
  /** Adds the "Preview — not live yet" strip and drops the canonical link. */
  preview?: boolean
  /** When this was rendered: the footer year, the privacy notice date. */
  date: Date
}


const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "2 October 2026" (UTC, so the same everywhere). */
export const longDate = (d: Date): string => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`

/** What the page says: the record's content plus the privacy link, dated by the render. */
export function siteContent(site: Site, trade: TradeConfig, o: Pick<DocumentOptions, 'base' | 'date'>): PageContent {
  return { ...pageContent(site, trade, FEATURES, o.date.getUTCFullYear()), privacy: `${o.base}${PRIVACY_PATH}` }
}

/** The site's stylesheet: its self-hosted fonts, the generator CSS and the page chrome. */
export function siteCss(site: Site): string {
  const p = site.style.resolved.palette
  return [
    fontFaceCss(site.style.resolved, '/fonts'),
    GEN_CSS,
    `html{-webkit-text-size-adjust:100%;text-size-adjust:100%}body.sb-page{margin:0;background:${p.ground};color:${p.ink}}`,
    PREVIEW_CSS,
    PRIVACY_CSS,
  ].join('\n')
}

const PREVIEW_CSS = `
.sb-preview-bar{margin:0;padding:8px 16px;background:#111;color:#fff;font:600 15px/1.4 system-ui,-apple-system,'Segoe UI',Arial,sans-serif;text-align:center}
.sb-preview-bar p{margin:0}
`
const previewBar = '<aside class="sb-preview-bar" aria-label="Preview notice"><p>Preview — not live yet</p></aside>'

function photoUrl(url: string, origin: string): string | null {
  if (url.startsWith('/')) return origin + url
  return url.startsWith('https://') ? url : null
}

function meta(c: PageContent, o: DocumentOptions, path: string, title: string): PageMeta {
  const hero = c.photos.hero
  const image = hero ? photoUrl(hero.url, o.origin) : null
  return {
    title,
    description: pageDescription(c),
    url: `${o.origin}${o.base}${path}`,
    image: image && hero ? { url: image, alt: hero.alt } : null,
    siteName: c.business.name || c.trade.name,
  }
}

function documentShell(head: string, body: string, o: DocumentOptions): string {
  return '<!doctype html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + `${head}<link rel="stylesheet" href="${esc(o.cssHref)}"></head><body class="sb-page">${o.preview ? previewBar : ''}${body}</body></html>\n`
}

const tagsFor = (site: Site, o: DocumentOptions, m: PageMeta) =>
  headTags(m, { noindex: o.noindex || !!o.preview, canonical: !o.preview, themeColor: site.style.resolved.palette.brandFill, base: o.base })

/** The home page. */
export function homeDocument(site: Site, trade: TradeConfig, o: DocumentOptions): string {
  const c = siteContent(site, trade, o)
  const body = renderPage(publishedPage(site, trade), site.style.resolved, c)
  return documentShell(tagsFor(site, o, meta(c, o, '/', pageTitle(c))), body, o)
}

/** The privacy notice page: the site's header and footer around the notice. */
export function privacyDocument(site: Site, trade: TradeConfig, o: DocumentOptions): string {
  const c = siteContent(site, trade, o)
  const style = site.style.resolved
  const foot = publishedPage(site, trade).find(s => s.type === 'footer')
  const back = `<p class="sb-legal-back"><a href="${esc(`${o.base}/`)}">Back to the ${esc(c.business.name || 'home')} page</a></p>`
  const main = privacySection(c, style, longDate(o.date)).replace('<div class="sb-legal-body">', `${back}<div class="sb-legal-body">`)
  const body = '<a class="sb-skip" href="#main">Skip to main content</a>'
    + renderHeader(style, c, [])
    + `<main id="main" tabindex="-1">${main}</main>`
    + (foot ? renderPageSection(foot, style, c) : '')
  return documentShell(tagsFor(site, o, meta(c, o, PRIVACY_PATH, `Privacy notice — ${c.business.name || c.trade.name}`)), body, o)
}

/** The site's icon (served at /favicon.svg). */
export const siteFavicon = (site: Site, trade: TradeConfig): string =>
  faviconSvg(pageContent(site, trade), site.style.resolved)
