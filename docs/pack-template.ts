// The template for a new business type. Copy it to src/packs/business/<id>.ts (the file name is
// the id), replace every TODO, and follow docs/adding-a-business-type.md. pack:check refuses any
// TODO left in, so you can't forget one. src/packs/business/plumber.ts is a finished example.
import { definePack } from '../define'
import type { PackLanding } from '../schema'

export const TODO_ID = definePack({
  kind: 'single',
  // Lower case, letters and dashes, singular: 'window-cleaner'. Never change it once live.
  id: 'TODO-id',
  // The page address /websites-for/<slug>/, usually the plural: 'window-cleaners'.
  slug: 'TODO-slug',
  // As the trade picker shows it: 'Window cleaner'.
  name: 'TODO',
  // Lower case, for sentences ("websites for window cleaners").
  plural: 'TODO',
  // Other words people use for it, lower case. No word another pack already uses.
  synonyms: ['TODO'],
  // One of src/packs/categories.ts: trade, outdoor, home-service, personal, creative, food.
  category: 'home-service',
  // true puts it among the homepage's trade chips (keep that list short).
  featured: false,
  emoji: '🧽',
  look: {
    // Upper-case hex. accent is the starting brand colour; the rest are kept for later use.
    colours: { navy: '#0B2545', navyHover: '#133762', accent: '#1E88E5', accentInk: '#0B5BA8', accentTint: '#E8F1FB' },
    // The theme a new site starts in: workwear, clean-pro, craft-heritage or friendly-local.
    theme: 'friendly-local',
  },
  copy: {
    tagline: 'TODO: the hero headline, e.g. Sparkling windows from your local cleaner.',
    cta: 'TODO: the main button, e.g. Get a free quote',
    ctaNote: 'TODO: a short reassurance, e.g. No obligation',
    offer: 'TODO: a plural noun phrase, e.g. Free quotes',
  },
  // Six to ten hero headline suggestions (60 characters max). {town} becomes the customer's
  // location; at least three must have no {town}. The builder offers three per site.
  headlines: [
    'TODO: e.g. Sparkling windows, every time.',
    'TODO',
    'TODO',
    'TODO: e.g. Your local window cleaner in {town}.',
    'TODO',
    'TODO',
  ],
  // Three to eight. Names up to 32 characters; descriptions are for the /websites-for/ page.
  services: [
    { name: 'TODO', description: 'TODO' },
    { name: 'TODO', description: 'TODO' },
    { name: 'TODO', description: 'TODO' },
  ],
  // Badges the customer can add (never added for them). Up to 40 characters each.
  badges: ['Fully insured', 'TODO', 'TODO'],
  // In page order, hero first, contact last-ish. Pick from src/packs/sections.ts. A section that
  // isn't built yet (menu, price_list…) makes the pack wait in WAITING_PACKS.
  sections: [
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'services' },
    { type: 'gallery' },
    { type: 'testimonials', optional: true },
    { type: 'contact' },
  ],
  stickyCallBar: false,
  // At least three, one with hero: true. Each file goes in reference/sample-photos and a row in
  // its LICENCE.md (same Pexels page). Alt text always starts "Sample photo: ".
  photos: [
    { file: 'TODO.jpg', alt: 'Sample photo: TODO', hero: true, credit: { licence: 'Pexels License', photographer: 'TODO', page: 'https://www.pexels.com/photo/TODO/' } },
  ],
})

/** The /websites-for/ page: its own export, so the builder's code never carries it. */
export const TODO_IDLanding: PackLanding = {
  // Up to 60 characters; the brand is added after it.
  title: 'Websites for TODO: live in 15 minutes, no monthly fee',
  // 70 to 160 characters: the line under the title in search results.
  description: 'TODO',
  headline: 'TODO',
  // Two or three short paragraphs, written for this trade only.
  intro: ['TODO', 'TODO'],
  // "What a <name> website needs": four to seven things specific to this trade.
  needs: [
    { title: 'TODO', text: 'TODO' },
    { title: 'TODO', text: 'TODO' },
    { title: 'TODO', text: 'TODO' },
    { title: 'TODO', text: 'TODO' },
  ],
  // Four to six questions this trade asks about its website.
  faqs: [
    { q: 'TODO', a: 'TODO' },
    { q: 'TODO', a: 'TODO' },
    { q: 'TODO', a: 'TODO' },
    { q: 'TODO', a: 'TODO' },
  ],
  // Three made-up businesses, each in a different theme (one in the pack's own theme). Any
  // number for seed; change it to get a different layout.
  examples: [
    { name: 'TODO', location: 'TODO', about: 'TODO', years: '10', areas: ['TODO', 'TODO', 'TODO'], theme: 'friendly-local', seed: 11111 },
    { name: 'TODO', location: 'TODO', about: 'TODO', years: '10', areas: ['TODO', 'TODO', 'TODO'], theme: 'clean-pro', seed: 22222 },
    { name: 'TODO', location: 'TODO', about: 'TODO', years: '10', areas: ['TODO', 'TODO', 'TODO'], theme: 'workwear', seed: 33333 },
  ],
}
