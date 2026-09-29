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
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'gallery' },
    { type: 'services' },
    { type: 'testimonials' },
    { type: 'contact' },
  ],
  ctaText: 'Get a Free Quote',
  ctaSubtext: 'Free, no-obligation quotes',
  trustSignals: ['Licensed & Insured', 'Free Estimates', 'Local Family Business', '10+ Years Experience', 'Satisfaction Guaranteed'],
  services: ['Interior Painting', 'Exterior Painting', 'Cabinet Refinishing', 'Deck Staining', 'Colour Consultation', 'Feature Walls'],
  stickyCallBar: true,
}
