import type { Site } from '../site/schema'
import type { TradeConfig } from '../types'
import { homeDocument, privacyDocument, siteCss, siteFavicon } from './document'
import { PRIVACY_PATH } from './paths'
import { robotsTxt, sitemapXml } from './meta'

/** One file of a published site, named as it is stored (and served, see filePath). */
export interface SiteFile {
  name: string
  body: string
  contentType: string
  /** Named by its content, so browsers may keep it for good. */
  immutable?: boolean
}

export interface PublishOptions {
  /** e.g. https://joes-plumbing.siteblocks.co.uk */
  origin: string
  noindex: boolean
  date: Date
}

const HTML = 'text/html; charset=utf-8'

async function shortHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest).slice(0, 6)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Every text file of a published site: pages, stylesheet, icon, sitemap and robots rules.
 * Photos are copied separately (their URLs must already point at /photos/<name>); fonts are
 * shared by all sites and served by the host.
 */
export async function siteFiles(site: Site, trade: TradeConfig, o: PublishOptions): Promise<SiteFile[]> {
  const css = siteCss(site)
  const cssName = `site-${await shortHash(css)}.css`
  const doc = { origin: o.origin, base: '', cssHref: `/${cssName}`, noindex: o.noindex, date: o.date }
  return [
    { name: 'index.html', body: homeDocument(site, trade, doc), contentType: HTML },
    { name: 'privacy.html', body: privacyDocument(site, trade, doc), contentType: HTML },
    { name: cssName, body: css, contentType: 'text/css; charset=utf-8', immutable: true },
    { name: 'favicon.svg', body: siteFavicon(site, trade), contentType: 'image/svg+xml' },
    { name: 'sitemap.xml', body: sitemapXml(o.origin, ['/', PRIVACY_PATH], o.date.toISOString().slice(0, 10)), contentType: 'application/xml; charset=utf-8' },
    { name: 'robots.txt', body: robotsTxt(o.origin, o.noindex), contentType: 'text/plain; charset=utf-8' },
  ]
}
