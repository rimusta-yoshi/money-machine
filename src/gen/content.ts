import type { HeroContent } from './hero/content'

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
}

/** Display name, never empty. */
export const businessName = (c: PageContent): string => c.business.name || `${c.trade.name} Co.`

/** The hero's slice of the page. */
export function heroView(c: PageContent): HeroContent {
  const { business: b, trade: t } = c
  return {
    headline: t.tagline,
    sub: `${t.ctaText}${b.location ? ` across ${b.location}` : ''}. ${t.ctaSubtext}.`,
    call: b.tel ? { label: `Call ${b.phone}`, href: b.tel } : null,
    // The contact section only exists with a phone number or email to show.
    quote: b.tel || b.email ? { label: t.ctaText, href: '#contact' } : null,
    photo: c.photos.hero,
    badges: c.badges,
    rating: c.rating,
    reviews: c.reviews,
    quoteForm: c.quoteForm,
  }
}
