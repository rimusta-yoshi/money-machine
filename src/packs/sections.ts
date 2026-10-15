/**
 * The shared section library. Every business type picks its sections from here; a pack never
 * defines a section of its own. BUILT sections exist in the generator (src/gen/sections);
 * PLANNED ones don't yet, but a pack may already name them: `npm run pack:check` then reports
 * the pack as "blocked on section X", so we can see which new sections unlock the most packs.
 */

/** Sections the generator can draw today (src/gen/sections/<section>.ts). */
export const SECTION_TYPES = [
  'hero',
  'trust_bar',
  'services',
  'about',
  'why_us',
  'gallery',
  'certifications',
  'testimonials',
  'areas',
  'contact',
  'footer',
] as const
export type SectionType = typeof SECTION_TYPES[number]

/** Sections packs may ask for before they exist. Add one here when a new business type needs it. */
export const PLANNED_SECTIONS = [
  'menu',
  'price_list',
  'opening_hours',
  'booking_button',
  'portfolio',
  'events',
] as const
export type PlannedSection = typeof PLANNED_SECTIONS[number]

export type SectionName = SectionType | PlannedSection

export const isBuilt = (name: SectionName): name is SectionType => (SECTION_TYPES as readonly string[]).includes(name)

/**
 * Optional sections only appear when the customer switches them on (testimonials: the reviews
 * extra in "Your look"). A pack can only mark these optional; every other section it lists is
 * always on the page.
 */
export const SWITCHABLE_SECTIONS: readonly SectionType[] = ['testimonials']

/** How the "Websites for…" pages describe each section, in plain words. */
export const SECTION_INFO: Record<SectionName, { name: string; text: string }> = {
  hero: { name: 'The top of your page', text: 'Your name, what you do and where, with a big button to call you.' },
  trust_bar: { name: 'Trust badges', text: 'The things customers check first: insured, registered, guaranteed.' },
  services: { name: 'Your services', text: 'What you do, filled in for you and easy to change.' },
  about: { name: 'About you', text: 'A few lines about you and how long you’ve been at it.' },
  why_us: { name: 'Why choose you', text: 'How you work: clear quotes, turning up on time, tidying up.' },
  gallery: { name: 'Photos of your work', text: 'Your best jobs, laid out to look their best on a phone.' },
  certifications: { name: 'Your qualifications', text: 'Registrations and memberships, shown clearly.' },
  testimonials: { name: 'Reviews', text: 'What your customers say, with your star rating.' },
  areas: { name: 'Areas you cover', text: 'The towns and villages you work in, so people know you’ll come.' },
  contact: { name: 'Contact', text: 'Your number, email and hours, one tap away on a phone.' },
  footer: { name: 'Footer', text: 'Your details again, and your privacy notice.' },
  menu: { name: 'Menu', text: 'Your dishes and prices.' },
  price_list: { name: 'Price list', text: 'Your prices, laid out clearly.' },
  opening_hours: { name: 'Opening hours', text: 'When you’re open, week by week.' },
  booking_button: { name: 'Booking', text: 'A button to book online.' },
  portfolio: { name: 'Portfolio', text: 'Your best work, project by project.' },
  events: { name: 'Events', text: 'What’s coming up, and how to book.' },
}
