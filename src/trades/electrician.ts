import type { TradeConfig } from '../types'

export const electrician: TradeConfig = {
  id: 'electrician',
  name: 'Electrician',
  emoji: '⚡',
  tagline: 'Certified electricians — safe, reliable, local',
  colorScheme: {
    primary: '#f59e0b',
    primaryDark: '#d97706',
    accent: '#1e293b',
    bg: '#ffffff',
    surface: '#fffbeb',
    text: '#0f172a',
    textMuted: '#64748b',
  },
  sections: [
    {
      type: 'hero',
      recommended: 'hero-bold-cta',
      variants: [
        { id: 'hero-bold-cta', label: 'Bold CTA', component: 'HeroBoldCta' },
        { id: 'hero-split', label: 'Split with photo', component: 'HeroSplit' },
      ],
    },
    {
      type: 'certifications',
      recommended: 'certs-prominent',
      variants: [
        { id: 'certs-prominent', label: 'Cert showcase', component: 'CertsProminent' },
        { id: 'certs-badges', label: 'Badge strip', component: 'CertsBadges' },
      ],
    },
    {
      type: 'services',
      recommended: 'services-cards',
      variants: [
        { id: 'services-cards', label: 'Service cards', component: 'ServicesCards' },
        { id: 'services-list', label: 'Simple list', component: 'ServicesList' },
      ],
    },
    {
      type: 'trust',
      recommended: 'trust-badges',
      variants: [
        { id: 'trust-badges', label: 'Badge row', component: 'TrustBadges' },
        { id: 'trust-bold', label: 'Bold trust banner', component: 'TrustBold' },
      ],
    },
    {
      type: 'contact',
      recommended: 'contact-form',
      variants: [
        { id: 'contact-form', label: 'Quote form', component: 'ContactForm' },
        { id: 'contact-simple', label: 'Phone + email', component: 'ContactSimple' },
      ],
    },
  ],
  ctaText: 'Book an Electrician',
  ctaSubtext: 'Same-day service available',
  trustSignals: ['Master Electrician Certified', 'ESA Approved', 'Fully Insured', '24/7 Emergency Calls'],
  services: ['Panel Upgrades', 'Rewiring', 'EV Charger Install', 'Lighting', 'Safety Inspections', 'Emergency Repairs'],
  stickyCallBar: false,
}
