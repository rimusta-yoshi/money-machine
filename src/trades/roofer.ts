import type { TradeConfig } from '../types'

export const roofer: TradeConfig = {
  id: 'roofer',
  name: 'Roofer',
  emoji: '🏠',
  tagline: 'Roofing done properly, by local roofers.',
  colorScheme: {
    navy: '#0D2113',
    navyHover: '#163320',
    accent: '#16A34A',
    accentInk: '#15803D',
    accentTint: '#F0FDF4',
  },
  sections: [
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'services' },
    { type: 'why_us' },
    { type: 'testimonials' },
    { type: 'contact' },
  ],
  ctaText: 'Book a free roof inspection',
  ctaSubtext: 'No obligation, and we come to you',
  offer: 'Free roof inspections',
  trustSignals: ['Fully insured', 'Manufacturer-backed warranty', 'Emergency repairs', 'Local family business', 'Storm damage repairs'],
  services: ['Roof replacement', 'Roof repairs', 'Gutters and fascias', 'Storm damage', 'Flat roofing', 'Roof inspections'],
  stickyCallBar: false,
}
