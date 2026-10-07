/**
 * The product's own name, in one place so it can change later (the price is the server's: see
 * price.ts). Used by the
 * homepage, the builder and the page titles (vite.config.ts fills %BRAND_NAME% in the HTML).
 * Customer sites never show any of this.
 */
export const BRAND = {
  /** Working name, always lowercase. */
  name: 'siteblocks',
  /** Where customers' free web addresses live: <name>.<domain>. */
  domain: 'siteblocks.co.uk',
  /** The refund promise, said the same way everywhere. */
  guarantee: { days: 14, line: '14-day money-back guarantee, no questions asked.' },
} as const
