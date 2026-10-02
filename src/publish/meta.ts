import { businessName } from '../gen'
import type { PageContent, SiteStyle } from '../gen'
import { esc } from '../gen/html'

/** What search results and link previews show for a site. */
export interface PageMeta {
  title: string
  description: string
  /** Absolute URL of the page (canonical and og:url). */
  url: string
  /** Absolute URL of the share image, if the site has a main photo. */
  image: { url: string; alt: string } | null
  siteName: string
}

const DESCRIPTION_MAX = 155

/** Shortens to a whole word under the limit, with an ellipsis if anything was cut. */
export function clip(text: string, max = DESCRIPTION_MAX): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[\s,.;:–—-]+$/, '')}…`
}

/** "Joe's Plumbing — Plumber in Leeds": the name, then what and where. */
export function pageTitle(c: PageContent): string {
  const name = businessName(c)
  const where = c.business.location ? ` in ${c.business.location}` : ''
  return `${name} — ${c.trade.name}${where}`
}

/** The customer's own about text, else the trade's tagline and offer. */
export function pageDescription(c: PageContent): string {
  if (c.business.about) return clip(c.business.about)
  const where = c.business.location ? ` across ${c.business.location}` : ''
  return clip(`${c.trade.tagline} ${c.trade.offer}${where}. ${c.trade.ctaSubtext}.`)
}

/** <head> tags for a page: title, description, robots, canonical, Open Graph and the icon. */
export function headTags(m: PageMeta, o: { noindex: boolean; canonical: boolean; themeColor: string; base: string }): string {
  const tag = (prop: string, content: string) => `<meta property="${prop}" content="${esc(content)}">`
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    o.noindex ? '<meta name="robots" content="noindex, nofollow">' : '',
    o.canonical ? `<link rel="canonical" href="${esc(m.url)}">` : '',
    tag('og:type', 'website'),
    tag('og:site_name', m.siteName),
    tag('og:title', m.title),
    tag('og:description', m.description),
    tag('og:url', m.url),
    tag('og:locale', 'en_GB'),
    m.image ? tag('og:image', m.image.url) + tag('og:image:alt', m.image.alt) : '',
    `<meta name="twitter:card" content="${m.image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="theme-color" content="${esc(o.themeColor)}">`,
    `<link rel="icon" href="${esc(o.base)}/favicon.svg" type="image/svg+xml">`,
  ].filter(Boolean).join('')
}

/** A rounded tile in the brand colour with the business's first letter. */
export function faviconSvg(c: PageContent, style: SiteStyle): string {
  const letter = (businessName(c).match(/[A-Za-z0-9]/)?.[0] ?? '').toUpperCase()
  const p = style.palette
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${esc(p.brandFill)}"/>`
    + `<text x="32" y="44" text-anchor="middle" font-family="system-ui,Segoe UI,Arial,sans-serif" font-size="34" font-weight="700" fill="${esc(p.brandInk)}">${esc(letter)}</text></svg>`
}

/** sitemap.xml for the site's pages, under its absolute origin. */
export function sitemapXml(origin: string, paths: readonly string[], lastmod: string): string {
  const urls = paths.map(p => `<url><loc>${esc(origin + p)}</loc><lastmod>${esc(lastmod)}</lastmod></url>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`
}

/** robots.txt: everything closed while noindex is on (staging), else open with the sitemap. */
export function robotsTxt(origin: string, noindex: boolean): string {
  return noindex ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`
}
