import type { TradeConfig } from '../types'

export const barber: TradeConfig = {
  id: 'barber',
  name: 'Barber',
  emoji: '✂️',
  tagline: 'Sharp cuts, great service — your local barbershop',
  colorScheme: {
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    accent: '#1e293b',
    bg: '#ffffff',
    surface: '#faf5ff',
    text: '#0f172a',
    textMuted: '#64748b',
  },
  sections: [
    {
      type: 'hero',
      recommended: 'hero-split',
      variants: [
        { id: 'hero-split', label: 'Split with photo', component: 'HeroSplit' },
        { id: 'hero-bold-cta', label: 'Bold CTA', component: 'HeroBoldCta' },
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
      type: 'gallery',
      recommended: 'gallery-masonry',
      variants: [
        { id: 'gallery-masonry', label: 'Work gallery', component: 'GalleryMasonry' },
        { id: 'gallery-row', label: 'Horizontal strip', component: 'GalleryRow' },
      ],
    },
    {
      type: 'testimonials',
      recommended: 'testimonials-cards',
      variants: [
        { id: 'testimonials-cards', label: 'Review cards', component: 'TestimonialsCards' },
        { id: 'testimonials-simple', label: 'Quote strip', component: 'TestimonialsSimple' },
      ],
    },
    {
      type: 'contact',
      recommended: 'contact-simple',
      variants: [
        { id: 'contact-simple', label: 'Phone + email', component: 'ContactSimple' },
        { id: 'contact-form', label: 'Booking form', component: 'ContactForm' },
      ],
    },
  ],
  ctaText: 'Book a Cut',
  ctaSubtext: 'Walk-ins welcome — appointments recommended',
  trustSignals: ['Locally Owned', '5-Star Rated', 'Experienced Barbers', 'No Waiting Guarantee'],
  services: ['Haircut & Styling', 'Beard Trim & Shape', 'Hot Towel Shave', 'Fade & Taper', 'Kids Cuts', 'Hair Colouring'],
  stickyCallBar: false,
}
