/**
 * Everything a hero can say. Derived from the page content (see heroView in ../content.ts);
 * the generator never invents any of it. Optional slots are empty when the record is.
 */
export interface HeroContent {
  headline: string
  sub: string
  /** Primary call to action. null only if the phone number has no digits. */
  call: { label: string; href: string } | null
  /** Secondary link to the contact section; null when there is no contact section. */
  quote: { label: string; href: string } | null
  photo: { url: string; alt: string } | null
  badges: readonly string[]
  rating: { score: number; count: number } | null
  reviews: readonly { text: string; author: string; location: string; rating: number }[]
  /** Whether enquiries have somewhere to go, which a hero quote form needs. */
  quoteForm: boolean
}

/** Content facts the generator gates archetypes and parameters on. */
export const hasPhoto = (c: HeroContent): boolean => c.photo !== null
export const reviewCount = (c: HeroContent): number => c.reviews.length
