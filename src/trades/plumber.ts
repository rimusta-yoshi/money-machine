import type { TradeConfig } from '../types'

export const plumber: TradeConfig = {
  id: 'plumber',
  name: 'Plumber',
  emoji: '🔧',
  tagline: 'Local plumbers you can rely on.',
  colorScheme: {
    navy: '#0B2545',
    navyHover: '#133762',
    accent: '#1E88E5',
    accentInk: '#0B5BA8',
    accentTint: '#E8F1FB',
  },
  sections: [
    { type: 'hero' },
    { type: 'trust_bar' },
    { type: 'services' },
    { type: 'about' },
    { type: 'why_us' },
    { type: 'testimonials' },
    { type: 'areas' },
    { type: 'contact' },
  ],
  ctaText: 'Get a free quote',
  ctaSubtext: 'No obligation',
  offer: 'Free quotes',
  trustSignals: ['Gas Safe registered', 'Fully insured', '24/7 emergency call-outs', 'Local family business', 'Same-day visits'],
  services: ['Leak repairs', 'Boiler repairs', 'Bathroom plumbing', 'Pipe installations', 'Drain unblocking', 'General plumbing'],
  stickyCallBar: true,
}
