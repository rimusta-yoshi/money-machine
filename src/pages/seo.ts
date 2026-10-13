import { sitemapXml } from '../publish/meta'
import { STATIC_PAGES } from './registry'

/**
 * Search-engine files for our own site (homepage, legal pages, guide), written by the build.
 * Until launch everything stays out of search; flipping LAUNCHED to "true" in
 * server/wrangler.api.jsonc opens it up on the next `npm run cf:deploy:app`.
 * Customers' sites get their own robots.txt and sitemap.xml when published (src/publish/files.ts).
 */

/** Pages search engines may list, once launched: never the builder, the dashboard or previews. */
export const PUBLIC_PATHS: readonly string[] = ['/', ...STATIC_PAGES.map(p => p.path)]

export function appRobotsTxt(launched: boolean, origin: string): string {
  if (!launched) return 'User-agent: *\nDisallow: /\n'
  return `User-agent: *\nAllow: /\nDisallow: /build/\nDisallow: /admin/\nSitemap: ${origin}/sitemap.xml\n`
}

/** The sitemap, or null before launch (it isn't published until then). */
export function appSitemap(launched: boolean, origin: string, date: Date): string | null {
  return launched ? sitemapXml(origin, PUBLIC_PATHS, date.toISOString().slice(0, 10)) : null
}

/**
 * Headers for every file of the homepage and builder (Workers static assets' _headers file).
 * The builder and dashboard are never indexed; everything else only before launch.
 */
export function appHeaders(launched: boolean): string {
  const noindex = '  X-Robots-Tag: noindex, nofollow'
  return [
    '# Written by the build (src/pages/seo.ts): edit there, not in dist/.',
    '/*',
    ...(launched ? [] : [noindex]),
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Strict-Transport-Security: max-age=31536000',
    '',
    // After launch the builder and dashboard still stay out of search (before it, /* covers them).
    ...(launched ? ['/build/*', noindex, ''] : []),
    '# The private dashboard (behind Cloudflare Access): never cached anywhere.',
    '/admin/*',
    '  Cache-Control: no-store',
    ...(launched ? [noindex] : []),
    '',
  ].join('\n')
}
