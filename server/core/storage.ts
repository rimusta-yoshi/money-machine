/** Where a published site's files are stored: sites/<slug>/<file>. */
export const sitePrefix = (slug: string): string => `sites/${slug}/`

/** Marks an address whose site was taken down (refunded): it shows "no longer available". */
export const goneKey = (slug: string): string => `gone/${slug}`
