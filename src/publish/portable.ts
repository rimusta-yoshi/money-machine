import { PRIVACY_PATH } from './paths'

/**
 * "Download your site": the published files, made to work from any folder or host. Only the
 * addresses change: links between our files become relative ("photos/x.webp", "privacy.html"),
 * and the tags that name the old address (canonical, og:url, og:image) or keep search engines
 * away (robots) are left out, since the new home is the owner's to decide. The content is
 * exactly what is published: no scripts, no tracking, nothing that calls us.
 */

/** Files a published site links by root path: its stylesheet, icon, photos and the shared fonts. */
const OWN_FILE = /(=["']|url\(['"]?)\/((?:photos|fonts)\/[a-z0-9][a-z0-9-]*\.[a-z0-9]+|site-[0-9a-f]+\.css|favicon\.svg)/g
const DROPPED_TAGS = /<meta name="robots"[^>]*>|<link rel="canonical"[^>]*>|<meta property="og:(?:url|image|image:alt)"[^>]*>/g

/** A published page with relative links, ready to open from a folder. */
export function portableHtml(html: string): string {
  return html
    .replace(DROPPED_TAGS, '')
    .replace(/href="\/"/g, 'href="index.html"')
    .replace(new RegExp(`href="${PRIVACY_PATH}/?"`, 'g'), 'href="privacy.html"')
    .replace(OWN_FILE, '$1$2')
}

/** The stylesheet with its fonts at fonts/<file> beside it. */
export const portableCss = (css: string): string => css.replace(OWN_FILE, '$1$2')

/** The font files a stylesheet uses, e.g. ["dm-sans-400.woff2"]. */
export const fontFiles = (css: string): string[] =>
  [...new Set([...css.matchAll(/url\(['"]?\/fonts\/([a-z0-9-]+\.woff2)['"]?\)/g)].map(m => m[1]))]

/** The photos pages show, e.g. ["photos/0a1b2c.webp"]. */
export const photoFiles = (...pages: string[]): string[] =>
  [...new Set(pages.flatMap(p => [...p.matchAll(/(?:=["']|url\(['"]?)\/(photos\/[a-z0-9][a-z0-9-]*\.(?:webp|jpg|png))/g)].map(m => m[1])))]

/** README.txt for the download. */
export function readmeTxt(o: { brand: string; siteUrl: string; guideUrl: string; date: string }): string {
  return [
    'Your website',
    '============',
    '',
    `This is a copy of ${o.siteUrl.replace(/\/$/, '')}, downloaded from ${o.brand} on ${o.date}.`,
    'It is yours to keep, and to put online wherever you like.',
    '',
    "What's inside",
    '-------------',
    'index.html     your home page',
    'privacy.html   your privacy notice',
    'site-....css   the styles (colours, layout)',
    'favicon.svg    the little icon browsers show in the tab',
    'photos/        your photos, full quality',
    'fonts/         the fonts your site uses, with their licence (LICENSES.txt)',
    '',
    'To look at it',
    '-------------',
    'Unzip this file, then double-click index.html. Your site opens in your browser,',
    'straight from your computer. No internet connection is needed.',
    '',
    'To put it online',
    '----------------',
    'Upload the folder that has index.html directly inside it to any web host. Our',
    'step-by-step guide, with two free options and how to use your own domain name:',
    o.guideUrl,
    '',
    'You can leave this README.txt out when you upload.',
    '',
  ].join('\r\n')
}
