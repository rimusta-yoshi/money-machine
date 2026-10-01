import type { TradeConfig } from '../types'

export const landscaper: TradeConfig = {
  id: 'landscaper',
  name: 'Landscaper',
  emoji: '🌿',
  tagline: 'Gardens and landscaping from your local team.',
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
  ctaText: 'Ask for a free estimate',
  ctaSubtext: 'No obligation',
  offer: 'Free estimates',
  trustSignals: ['Fully insured', 'Locally owned', 'Free garden visits', 'Waste taken away'],
  services: ['Lawn care', 'Garden design', 'Turfing', 'Planting and borders', 'Tree and hedge trimming', 'Patios and paths'],
  stickyCallBar: false,
}
