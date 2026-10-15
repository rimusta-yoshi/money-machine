import { sourceFromSearch, withSource } from '../analytics/source'

/**
 * The only script on the "Websites for…" pages, the hub and the 404 page: a visitor who came
 * from an ad (?src=, utm_source, utm_campaign) keeps that tag on every builder link, as on the
 * homepage. Without one, the links stay as built. Nothing is stored or sent.
 */
export function carrySource(doc: Document, search: string): void {
  const source = sourceFromSearch(search)
  for (const a of doc.querySelectorAll<HTMLAnchorElement>('a[data-build]')) {
    const href = a.getAttribute('href')
    if (href) a.setAttribute('href', withSource(href, source))
  }
}

if (typeof document !== 'undefined') carrySource(document, window.location.search)
