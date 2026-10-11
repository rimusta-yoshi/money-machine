/**
 * The product's own name and domain, in one place (the price is the server's: see price.ts).
 * Used by the homepage, the builder, the page titles (vite.config.ts fills %BRAND_NAME% in the
 * HTML), the server (emails, the Stripe page) and the "hosted by" line in customers' privacy
 * notices. The wrangler configs must name the same domain: brand.test.ts checks they do.
 */
export const BRAND = {
  /** The name in text: page titles, emails, Stripe, legal pages. */
  name: 'Local Blocks',
  /** The logo's wordmark, always lowercase. */
  wordmark: 'localblocks',
  /** Where everything lives; customers' free web addresses are <name>.<domain>. */
  domain: 'localblocks.co.uk',
  /** Replies and questions land here (no noreply, no separate help address). */
  email: 'hello@localblocks.co.uk',
  /** Where abuse reports go (legal pages, the abuse notice). */
  abuseEmail: 'abuse@localblocks.co.uk',
  /** The refund promise, said the same way everywhere. */
  guarantee: { days: 14, line: '14-day money-back guarantee, no questions asked.' },
  /** Footer links to the privacy policy and terms: switched on when the legal pages go live. */
  legalPages: false,
} as const
