import type { TradeConfig } from '../types'

export const landscaper: TradeConfig = {
  id: 'landscaper',
  name: 'Landscaper',
  emoji: '🌿',
  tagline: 'Lawn care and landscaping — your neighbourhood specialists.',
  colorScheme: {
    navy: '#0A1F0E',
    navyHover: '#132B18',
    accent: '#15803D',
    accentInk: '#166534',
    accentTint: '#F0FDF4',
  },
  sections: [
    {
      type: 'hero',
      recommended: 'hero-split',
      variants: [
        { id: 'hero-split', label: 'Split with photo', component: 'HeroSplit' },
        { id: 'hero-dark', label: 'Dark hero', component: 'HeroDark' },
      ],
    },
    {
      type: 'trust_bar',
      recommended: 'trust-bar-scroll',
      variants: [
        { id: 'trust-bar-scroll', label: 'Scroll strip', component: 'TrustBarScroll' },
        { id: 'trust-grid', label: 'Trust grid', component: 'TrustGrid' },
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
      recommended: 'services-grid',
      variants: [
        { id: 'services-grid', label: 'Cards + urgent', component: 'ServicesGrid' },
        { id: 'services-list', label: 'List rows', component: 'ServicesList' },
      ],
    },
    {
      type: 'testimonials',
      recommended: 'reviews-carousel',
      variants: [
        { id: 'reviews-carousel', label: 'Review carousel', component: 'ReviewsCarousel' },
      ],
    },
    {
      type: 'contact',
      recommended: 'contact-full',
      variants: [
        { id: 'contact-full', label: 'Full (hours + form)', component: 'ContactFull' },
        { id: 'contact-simple', label: 'Simple CTA', component: 'ContactSimple' },
      ],
    },
  ],
  ctaText: 'Request a Free Estimate',
  ctaSubtext: 'Serving your area since 2005',
  trustSignals: ['Licensed & Insured', 'Locally Owned', 'Satisfaction Guaranteed', 'Free Consultations', '15+ Years Experience', 'Eco-Friendly Practices'],
  services: ['Lawn Maintenance', 'Landscape Design', 'Sod Installation', 'Garden Beds', 'Tree Trimming', 'Snow Removal'],
  stickyCallBar: false,
}
