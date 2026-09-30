import type { SectionType } from '../types'

/**
 * What a section is waiting for when the customer's content doesn't yet allow any of
 * its layouts. The builder shows a faded example with this line; the live site leaves the
 * section out until the customer adds it.
 */
export const SECTION_NEEDS: Partial<Record<SectionType, string>> = {
  trust_bar: 'Add a credential, your star rating, jobs done or years in business to show this.',
  why_us: 'Add your reasons to choose you to show this.',
  gallery: 'Add photos of your work to show this.',
  certifications: 'Add your credentials to show this.',
  testimonials: 'Add your customer reviews to show this.',
  areas: 'Add the areas you cover to show this.',
  contact: 'Add your phone number or email to show this.',
}
