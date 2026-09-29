import type { SectionType } from '../types'

/**
 * What a section is waiting for when the customer's content doesn't yet allow any of
 * its layouts. The builder shows this instead of made-up placeholder content.
 */
export const SECTION_NEEDS: Partial<Record<SectionType, string>> = {
  trust_bar: 'Add a credential, your star rating, jobs done or years in business to show this section.',
  gallery: 'Add photos of your work to show this section.',
  certifications: 'Add your credentials to show this section.',
  testimonials: 'Add a customer review to show this section.',
  areas: 'Add the areas you cover to show this section.',
  contact: 'Add a phone number or email to show this section.',
}
