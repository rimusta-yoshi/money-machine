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
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'gallery' },
    { type: 'services' },
    { type: 'testimonials' },
    { type: 'contact' },
  ],
  ctaText: 'Request a Free Estimate',
  ctaSubtext: 'Free, no-obligation consultations',
  trustSignals: ['Licensed & Insured', 'Locally Owned', 'Satisfaction Guaranteed', 'Free Consultations', '15+ Years Experience', 'Eco-Friendly Practices'],
  services: ['Lawn Maintenance', 'Landscape Design', 'Sod Installation', 'Garden Beds', 'Tree Trimming', 'Snow Removal'],
  stickyCallBar: false,
}
