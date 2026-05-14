import type { TradeConfig } from '../types'

export const roofer: TradeConfig = {
  id: 'roofer',
  name: 'Roofer',
  emoji: '🏠',
  tagline: 'Trusted roofing contractors — local, licensed, guaranteed',
  colorScheme: {
    primary: '#dc2626',
    primaryDark: '#b91c1c',
    accent: '#1e293b',
    bg: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textMuted: '#64748b',
  },
  sections: [
    {
      type: 'hero',
      recommended: 'hero-split',
      variants: [
        { id: 'hero-split', label: 'Split with photo', component: 'HeroSplit' },
        { id: 'hero-bold-cta', label: 'Bold CTA', component: 'HeroBoldCta' },
      ],
    },
    {
      type: 'trust',
      recommended: 'trust-bold',
      variants: [
        { id: 'trust-bold', label: 'Bold trust banner', component: 'TrustBold' },
        { id: 'trust-badges', label: 'Badge row', component: 'TrustBadges' },
      ],
    },
    {
      type: 'services',
      recommended: 'services-cards',
      variants: [
        { id: 'services-cards', label: 'Service cards', component: 'ServicesCards' },
        { id: 'services-list', label: 'Simple list', component: 'ServicesList' },
      ],
    },
    {
      type: 'testimonials',
      recommended: 'testimonials-cards',
      variants: [
        { id: 'testimonials-cards', label: 'Review cards', component: 'TestimonialsCards' },
        { id: 'testimonials-simple', label: 'Quote strip', component: 'TestimonialsSimple' },
      ],
    },
    {
      type: 'contact',
      recommended: 'contact-form',
      variants: [
        { id: 'contact-form', label: 'Quote form', component: 'ContactForm' },
        { id: 'contact-simple', label: 'Phone + email', component: 'ContactSimple' },
      ],
    },
  ],
  ctaText: 'Get a Free Roof Inspection',
  ctaSubtext: 'No obligation — we come to you',
  trustSignals: ['30+ Years Experience', 'Fully Licensed & Insured', 'Manufacturer Warranty', 'Emergency Service Available'],
  services: ['Roof Replacement', 'Roof Repair', 'Gutters & Fascia', 'Storm Damage', 'Flat Roofing', 'Inspections'],
  stickyCallBar: false,
}
