/**
 * The product's own name and price, in one place so they can change later. Used by the
 * homepage, the builder and the page titles (vite.config.ts fills %BRAND_NAME% in the HTML).
 * Customer sites never show any of this.
 */
export const BRAND = {
  /** Working name, always lowercase. */
  name: 'siteblocks',
  /** Where customers' free web addresses live: <name>.<domain>. */
  domain: 'siteblocks.co.uk',
  /** The one price, said plainly. */
  price: '£99',
  /** The refund promise, said the same way everywhere. */
  guarantee: { days: 14, line: '14-day money-back guarantee, no questions asked.' },
} as const
