/**
 * Everything a hero can say. Built from the site record by the app (see src/site/heroContent.ts);
 * the generator never invents any of it. Optional slots are empty when the record is.
 */
export interface HeroContent {
  headline: string
  sub: string
  /** Primary call to action. null only if the phone number has no digits. */
  call: { label: string; href: string } | null
  /** Secondary link, e.g. to the contact section. */
  quote: { label: string; href: string }
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
