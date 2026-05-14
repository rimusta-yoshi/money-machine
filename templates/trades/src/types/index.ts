export type TradeId = 'painter' | 'roofer' | 'electrician' | 'landscaper'

export type SectionType =
  | 'hero'
  | 'services'
  | 'gallery'
  | 'trust'
  | 'certifications'
  | 'testimonials'
  | 'contact'

export interface ColorScheme {
  primary: string
  primaryDark: string
  accent: string
  bg: string
  surface: string
  text: string
  textMuted: string
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
