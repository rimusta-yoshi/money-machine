export type TradeId = 'painter' | 'roofer' | 'electrician' | 'landscaper' | 'plumber'

export type SectionType =
  | 'hero'
  | 'trust_bar'
  | 'services'
  | 'about'
  | 'why_us'
  | 'gallery'
  | 'certifications'
  | 'testimonials'
  | 'areas'
  | 'contact'

export interface ColorScheme {
  navy: string
  navyHover: string
  accent: string
  accentInk: string
  accentTint: string
}

export interface SectionVariant {
  id: string
  label: string
  component: string
}

export interface SectionConfig {
  type: SectionType
  recommended: string
  variants: SectionVariant[]
}

export interface TradeConfig {
  id: TradeId
  name: string
  emoji: string
  tagline: string
  colorScheme: ColorScheme
  sections: SectionConfig[]
  ctaText: string
  ctaSubtext: string
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
}

export interface BuilderState {
  trade: TradeConfig | null
  business: BusinessInfo
  selections: Record<SectionType, string>
}
