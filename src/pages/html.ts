import { BRAND } from '../brand/config'

/** Small HTML helpers shared by our build-time pages (plain pages, type pages, the hub, 404). */

export const esc = (s: string): string => s.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

/** The icon set (scripts/pack-images.mjs draws the PNGs from public/favicon.svg). */
export const ICON_LINKS = [
  '<link rel="icon" href="/favicon.ico" sizes="32x32" />',
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  '<link rel="manifest" href="/site.webmanifest" />',
].join('\n    ')

/** The homepage's link-preview image; pages without their own use it too. */
export const HOME_OG_IMAGE = '/og/home.png'

export interface SocialMeta {
  title: string
  description: string
  /** The page's full address. */
  url: string
  /** A path on our own site, e.g. /og/plumbers.png. */
  image: string
  imageAlt: string
  type?: 'website' | 'article'
}

/** Canonical link, Open Graph and the large Twitter card, all pointing at our own address. */
export function socialTags(m: SocialMeta, origin: string): string {
  const image = `${origin}${m.image}`
  return [
    `<link rel="canonical" href="${esc(m.url)}">`,
    `<meta property="og:type" content="${m.type ?? 'website'}"><meta property="og:site_name" content="${esc(BRAND.name)}"><meta property="og:locale" content="en_GB">`,
    `<meta property="og:title" content="${esc(m.title)}"><meta property="og:description" content="${esc(m.description)}"><meta property="og:url" content="${esc(m.url)}">`,
    `<meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(m.imageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(image)}">`,
  ].join('\n    ')
}

/** Structured data for search engines. `<` is escaped so the text can never close the script. */
export const jsonLd = (data: object): string =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
