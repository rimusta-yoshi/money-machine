export interface PagePhoto { url: string; alt: string }
export interface PageReview { text: string; author: string; location: string; rating: number }

/**
 * Everything a generated page may say, from the site record and the trade's own copy.
 * Built by the app (src/site/pageContent.ts). The generator never invents content:
 * empty slots stay empty, and layouts that need them are ruled out.
 */
export interface PageContent {
  trade: {
    name: string
    tagline: string
    ctaText: string
    ctaSubtext: string
    offer: string
    services: readonly string[]
  }
  business: {
    name: string
    phone: string
    /** tel: link for the phone number, or null if it has no digits. */
    tel: string | null
    email: string
    location: string
    about: string
    years: string
  }
  badges: readonly string[]
  /** Why-us lines the customer chose (title, sentence). Empty until they tick or write one. */
  whyUs: readonly (readonly [string, string])[]
  /** A note under the credentials, only if the customer added it. */
  certsNote: string | null
  areas: readonly string[]
  hours: readonly { day: string; time: string }[]
  emergency: boolean
  jobsDone: string | null
  /** Only when the reviews extra is on. */
  rating: { score: number; count: number } | null
  reviews: readonly PageReview[]
  photos: { hero: PagePhoto | null; about: PagePhoto | null; gallery: readonly PagePhoto[] }
  /** A working enquiry form: needs FEATURES.enquiries and an email. */
  quoteForm: boolean
  /** For the footer's copyright line. Passed in so rendering stays a pure function. */
  year: number
  /**
   * Builder-only sample content for previewing layouts. Never part of a site record, and
   * the publishing renderer refuses it (see renderPage).
   */
  sample?: true
}

/** "Free quotes across Leeds. No obligation." The offer line under headings, in plain sentence case. */
export const offerLine = (c: Pick<PageContent, 'trade' | 'business'>): string =>
  `${c.trade.offer}${c.business.location ? ` across ${c.business.location}` : ''}. ${c.trade.ctaSubtext}.`

/** Display name, never empty. */
export const businessName = (c: PageContent): string => c.business.name || `${c.trade.name} Co.`

/**
 * Short, true things about the business, for stickers, floating cards and proof strips:
 * the customer's own credentials, rating, emergency cover, years and place. Never invented.
 */
export function facts(c: PageContent): string[] {
  return [
    ...(c.rating ? [`★ ${c.rating.score} from ${c.rating.count} reviews`] : []),
    ...c.badges.filter(b => b.length <= 32),
    ...(c.emergency ? ['Emergency call-outs'] : []),
    ...(c.business.years ? [`${c.business.years} years in business`] : []),
    ...(c.jobsDone ? [`${c.jobsDone} jobs done`] : []),
  ]
}
