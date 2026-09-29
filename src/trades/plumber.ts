import type { TradeConfig } from '../types'

export const plumber: TradeConfig = {
  id: 'plumber',
  name: 'Plumber',
  emoji: '🔧',
  tagline: 'Local plumbers you can actually rely on.',
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
  ctaText: 'Get a Free Quote',
  ctaSubtext: 'Free, no-obligation quotes',
  trustSignals: ['Fully Insured · £2m', 'Local Family Business', '24/7 Emergency Callouts', '12+ Years Experience', 'Same-Day Visits'],
  services: ['Leak Repairs', 'Boiler Repairs', 'Bathroom Plumbing', 'Pipe Installations', 'Drain Unblocking', 'General Plumbing'],
  stickyCallBar: true,
}
