import type { TradeConfig } from '../types'

export const plumber: TradeConfig = {
  id: 'plumber',
  name: 'Plumber',
  emoji: '🔧',
  tagline: 'Fast, reliable plumbing — local, licensed, and guaranteed',
  colorScheme: {
    primary: '#1d4ed8',
    primaryDark: '#1e3a8a',
    accent: '#1c1917',
    bg: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textMuted: '#64748b',
  },
  sections: [
    {
      type: 'hero',
      recommended: 'hero-bold-cta',
      variants: [
        { id: 'hero-bold-cta', label: 'Bold CTA', component: 'HeroBoldCta' },
        { id: 'hero-split', label: 'Split with photo', component: 'HeroSplit' },
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
  ctaText: 'Get a Free Quote',
  ctaSubtext: 'Emergency callouts available 24/7',
  trustSignals: ['Gas Safe Registered', 'Fully Insured', 'Same-Day Service', 'No Call-Out Charge'],
  services: ['Boiler Repair & Servicing', 'Leak Detection & Repair', 'Bathroom Installation', 'Central Heating', 'Emergency Plumbing', 'Drain Unblocking'],
  stickyCallBar: true,
}
