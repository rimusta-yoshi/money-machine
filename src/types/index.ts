export const TRADE_IDS = ['painter', 'roofer', 'electrician', 'landscaper', 'plumber'] as const
export type TradeId = typeof TRADE_IDS[number]

export const SECTION_TYPES = [
  'hero',
  'trust_bar',
  'services',
  'about',
  'why_us',
  'gallery',
  'certifications',
  'testimonials',
  'areas',
  'contact',
  'footer',
] as const
export type SectionType = typeof SECTION_TYPES[number]

export interface ColorScheme {
  navy: string
  navyHover: string
  accent: string
  accentInk: string
  accentTint: string
}

/** A section the trade's site includes. Its layouts come from the generator (src/gen). */
export interface SectionConfig {
  type: SectionType
}

export interface TradeConfig {
  id: TradeId
  name: string
  emoji: string
  tagline: string
  colorScheme: ColorScheme
  sections: SectionConfig[]
  /** The main call to action, in sentence case (e.g. "Get a free quote"). */
  ctaText: string
  /** A short reassurance after the offer (e.g. "No obligation"). */
  ctaSubtext: string
  /** What's on offer, as a plural noun phrase (e.g. "Free quotes"); lines like "Free quotes across Leeds." are built from it. */
  offer: string
  trustSignals: string[]
  services: string[]
  stickyCallBar: boolean
}

export interface BusinessInfo {
  name: string
  phone: string
  location: string
  about: string
  yearsInBusiness: string
  email: string
}
