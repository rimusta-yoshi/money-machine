import type { TradeConfig } from '../types'

export const electrician: TradeConfig = {
  id: 'electrician',
  name: 'Electrician',
  emoji: '⚡',
  tagline: 'Certified electricians — safe, reliable, local.',
  colorScheme: {
    navy: '#1C1710',
    navyHover: '#2A2318',
    accent: '#D97706',
    accentInk: '#B45309',
    accentTint: '#FEF3C7',
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
      ],
    },
    {
      type: 'certifications',
      recommended: 'certs-prominent',
      variants: [
        { id: 'certs-prominent', label: 'Cert showcase', component: 'CertsProminent' },
        { id: 'certs-badges', label: 'Badge strip', component: 'CertsBadges' },
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
  ctaText: 'Book an Electrician',
  ctaSubtext: 'Same-day service available',
  trustSignals: ['Master Electrician Certified', 'NICEIC Approved', 'Fully Insured', '24/7 Emergency Calls', 'Free Safety Inspections', 'EV Charger Specialists'],
  services: ['Panel Upgrades', 'Rewiring', 'EV Charger Install', 'Lighting', 'Safety Inspections', 'Emergency Repairs'],
  stickyCallBar: false,
}
