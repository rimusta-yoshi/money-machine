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
  /**
   * Who runs the business, for the privacy policy and terms (content/legal/*.md). Fill these in
   * before launch: while any still reads like "[FULL NAME]", the pages show it highlighted and a
   * build with LAUNCHED "true" (server/wrangler.api.jsonc) stops with an error.
   */
  legal: {
    owner: '[FULL NAME]',
    address: '[BUSINESS ADDRESS]',
    icoNumber: '[ICO REGISTRATION NUMBER]',
    /** When the legal text last changed, e.g. "13 October 2026". */
    updated: '[DATE]',
  },
} as const

/** Our own plain pages (content/*.md, built by vite.config.ts), as linked from footers and emails. */
export const PAGES = {
  privacy: '/privacy/',
  terms: '/terms/',
  hostingGuide: '/guide/host-your-own-site/',
} as const
