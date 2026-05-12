import type { TradeConfig } from '../types'

export const painter: TradeConfig = {
  id: 'painter',
  name: 'Painter',
  emoji: '🖌️',
  tagline: 'Professional painting services in your area',
  colorScheme: {
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    accent: '#f59e0b',
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
      type: 'services',
      recommended: 'services-cards',
      variants: [
        { id: 'services-cards', label: 'Service cards', component: 'ServicesCards' },
        { id: 'services-list', label: 'Simple list', component: 'ServicesList' },
      ],
    },
    {
      type: 'gallery',
      recommended: 'gallery-masonry',
      variants: [
        { id: 'gallery-masonry', label: 'Before & after grid', component: 'GalleryMasonry' },
        { id: 'gallery-row', label: 'Horizontal strip', component: 'GalleryRow' },
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
  ctaSubtext: 'We respond within 2 hours',
  trustSignals: ['Licensed & Insured', 'Free Estimates', 'Local Family Business', '5-Star Rated'],
  services: ['Interior Painting', 'Exterior Painting', 'Cabinet Refinishing', 'Deck Staining', 'Colour Consultation'],
  stickyCallBar: true,
}
