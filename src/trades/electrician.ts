import type { TradeConfig } from '../types'

export const electrician: TradeConfig = {
  id: 'electrician',
  name: 'Electrician',
  emoji: '⚡',
  tagline: 'Safe, tidy electrical work from local electricians.',
  colorScheme: {
    navy: '#1C1710',
    navyHover: '#2A2318',
    accent: '#D97706',
    accentInk: '#B45309',
    accentTint: '#FEF3C7',
  },
  sections: [
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'certifications' },
    { type: 'services' },
    { type: 'testimonials' },
    { type: 'contact' },
  ],
  ctaText: 'Book an electrician',
  ctaSubtext: 'No obligation',
  offer: 'Free quotes',
  trustSignals: ['NICEIC approved', 'Fully insured', '24/7 emergency call-outs', 'Part P registered', 'EV charger installer'],
  services: ['Fuse board upgrades', 'Rewiring', 'EV charger installation', 'Lighting', 'Safety inspections', 'Emergency repairs'],
  stickyCallBar: false,
}
