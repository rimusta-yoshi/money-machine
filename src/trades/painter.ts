import type { TradeConfig } from '../types'

export const painter: TradeConfig = {
  id: 'painter',
  name: 'Painter',
  emoji: '🖌️',
  tagline: 'Professional painting you can actually see the difference.',
  colorScheme: {
    navy: '#1E3A5F',
    navyHover: '#2A4F7C',
    accent: '#2563EB',
    accentInk: '#1D4ED8',
    accentTint: '#EFF6FF',
  },
  sections: [
    {
      type: 'hero',
      recommended: 'hero-dark',
      variants: [
        { id: 'hero-dark', label: 'Dark hero', component: 'HeroDark' },
        { id: 'hero-split', label: 'Split with photo', component: 'HeroSplit' },
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
        { id: 'gallery-masonry', label: 'Before & after grid', component: 'GalleryMasonry' },
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
  ctaText: 'Get a Free Quote',
  ctaSubtext: 'We respond within 2 hours',
  trustSignals: ['Licensed & Insured', 'Free Estimates', 'Local Family Business', '5-Star Rated', '10+ Years Experience', 'Satisfaction Guaranteed'],
  services: ['Interior Painting', 'Exterior Painting', 'Cabinet Refinishing', 'Deck Staining', 'Colour Consultation', 'Feature Walls'],
  stickyCallBar: true,
}
