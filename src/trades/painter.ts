import type { TradeConfig } from '../types'

export const painter: TradeConfig = {
  id: 'painter',
  name: 'Painter',
  emoji: '🖌️',
  tagline: 'Painting and decorating with a finish you’ll notice.',
  colorScheme: {
    navy: '#1E3A5F',
    navyHover: '#2A4F7C',
    accent: '#2563EB',
    accentInk: '#1D4ED8',
    accentTint: '#EFF6FF',
  },
  sections: [
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'gallery' },
    { type: 'services' },
    { type: 'testimonials' },
    { type: 'contact' },
  ],
  ctaText: 'Get a free quote',
  ctaSubtext: 'No obligation',
  offer: 'Free quotes',
  trustSignals: ['Fully insured', 'Local family business', 'Dust sheets and a tidy finish', 'Colour advice included'],
  services: ['Interior painting', 'Exterior painting', 'Kitchen cabinet painting', 'Deck staining', 'Colour advice', 'Feature walls'],
  stickyCallBar: true,
}
