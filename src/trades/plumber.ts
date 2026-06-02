import type { TradeConfig } from '../types'

export const plumber: TradeConfig = {
  id: 'plumber',
  name: 'Plumber',
  emoji: '🔧',
  tagline: 'Local plumbers you can actually rely on.',
  colorScheme: {
    navy: '#0B2545',
    navyHover: '#133762',
    accent: '#1E88E5',
    accentInk: '#0B5BA8',
    accentTint: '#E8F1FB',
  },
  sections: [
    {
      type: 'hero',
      recommended: 'hero-dark',
      variants: [
        { id: 'hero-dark', label: 'Dark navy hero', component: 'HeroDark' },
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
      type: 'services',
      recommended: 'services-grid',
      variants: [
        { id: 'services-grid', label: 'Cards + urgent', component: 'ServicesGrid' },
        { id: 'services-list', label: 'List rows', component: 'ServicesList' },
      ],
    },
    {
      type: 'about',
      recommended: 'about-photo',
      variants: [
        { id: 'about-photo', label: 'Photo + stats', component: 'AboutPhotoLed' },
      ],
    },
    {
      type: 'why_us',
      recommended: 'why-features',
      variants: [
        { id: 'why-features', label: 'Feature rows', component: 'WhyUsFeatures' },
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
      type: 'areas',
      recommended: 'areas-grid',
      variants: [
        { id: 'areas-grid', label: 'Area grid + map', component: 'AreasGrid' },
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
  ctaSubtext: 'We respond within 15 minutes',
  trustSignals: ['Fully Insured · £2m', 'Local Family Business', '24/7 Emergency Callouts', '5★ Rated · 312 Reviews', '12+ Years Experience', 'Same-Day Visits'],
  services: ['Leak Repairs', 'Boiler Repairs', 'Bathroom Plumbing', 'Pipe Installations', 'Drain Unblocking', 'General Plumbing'],
  stickyCallBar: true,
}
