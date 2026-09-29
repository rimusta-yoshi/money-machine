import { facts } from '../content'
import type { PageContent, PagePhoto, PageReview } from '../content'

/**
 * Everything a hero can say, derived from the page content. The generator never invents
 * any of it; optional slots are empty when the record is.
 */
export interface HeroContent {
  headline: string
  sub: string
  /** "Plumber · Leeds": the trade and place, for the eyebrow. */
  eyebrow: string
  place: string
  /** Primary call to action. null only if the phone number has no digits. */
  call: { number: string; href: string } | null
  /** Secondary link to the contact section; null when there is no contact section. */
  quote: { label: string; href: string } | null
  photo: PagePhoto | null
  badges: readonly string[]
  rating: { score: number; count: number } | null
  reviews: readonly PageReview[]
  /** Short true facts for stickers and floating cards. */
  facts: readonly string[]
  subtext: string
  /** Whether enquiries have somewhere to go, which a hero quote form needs. */
  quoteForm: boolean
}

export function heroView(c: PageContent): HeroContent {
  const { business: b, trade: t } = c
  return {
    headline: t.tagline,
    sub: `${t.ctaText}${b.location ? ` across ${b.location}` : ''}. ${t.ctaSubtext}.`,
    eyebrow: b.location ? `${t.name} · ${b.location}` : t.name,
    place: b.location,
    call: b.tel ? { number: b.phone, href: b.tel } : null,
    // The contact section only exists with a phone number or email to show.
    quote: b.tel || b.email ? { label: t.ctaText, href: '#contact' } : null,
    photo: c.photos.hero,
    badges: c.badges,
    rating: c.rating,
    reviews: c.reviews,
    facts: facts(c),
    subtext: t.ctaSubtext,
    quoteForm: c.quoteForm,
  }
}

/** Content facts the generator gates archetypes and parameters on. */
export const hasPhoto = (c: HeroContent): boolean => c.photo !== null
export const reviewCount = (c: HeroContent): number => c.reviews.length
