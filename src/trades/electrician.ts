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
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'certifications' },
    { type: 'services' },
    { type: 'testimonials' },
    { type: 'contact' },
  ],
  ctaText: 'Book an Electrician',
  ctaSubtext: 'Free, no-obligation quotes',
  trustSignals: ['Master Electrician Certified', 'NICEIC Approved', 'Fully Insured', '24/7 Emergency Calls', 'Free Safety Inspections', 'EV Charger Specialists'],
  services: ['Panel Upgrades', 'Rewiring', 'EV Charger Install', 'Lighting', 'Safety Inspections', 'Emergency Repairs'],
  stickyCallBar: false,
}
