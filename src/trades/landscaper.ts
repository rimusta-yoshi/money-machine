import type { TradeConfig } from '../types'

export const landscaper: TradeConfig = {
  id: 'landscaper',
  name: 'Landscaper',
  emoji: '🌿',
  tagline: 'Lawn care and landscaping — your neighbourhood specialists',
  colorScheme: {
    primary: '#16a34a',
    primaryDark: '#15803d',
    accent: '#78350f',
    bg: '#ffffff',
    surface: '#f0fdf4',
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
      type: 'gallery',
      recommended: 'gallery-masonry',
      variants: [
        { id: 'gallery-masonry', label: 'Project gallery', component: 'GalleryMasonry' },
        { id: 'gallery-row', label: 'Horizontal strip', component: 'GalleryRow' },
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
  ctaText: 'Request a Free Estimate',
  ctaSubtext: 'Serving your area since 2005',
  trustSignals: ['Licensed & Insured', 'Locally Owned', 'Satisfaction Guaranteed', 'Free Consultations'],
  services: ['Lawn Maintenance', 'Landscape Design', 'Sod Installation', 'Garden Beds', 'Snow Removal', 'Tree Trimming'],
  stickyCallBar: false,
}
