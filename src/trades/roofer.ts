import type { TradeConfig } from '../types'

export const roofer: TradeConfig = {
  id: 'roofer',
  name: 'Roofer',
  emoji: '🏠',
  tagline: 'Trusted roofing — local, licensed, and guaranteed.',
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
  ctaText: 'Get a Free Roof Inspection',
  ctaSubtext: 'No obligation — we come to you',
  trustSignals: ['30+ Years Experience', 'Fully Licensed & Insured', 'Manufacturer Warranty', 'Emergency Service Available', 'Free Estimates', 'Storm Damage Specialists'],
  services: ['Roof Replacement', 'Roof Repair', 'Gutters & Fascia', 'Storm Damage', 'Flat Roofing', 'Inspections'],
  stickyCallBar: false,
}
