export type TradeId = 'painter' | 'roofer' | 'electrician' | 'landscaper' | 'plumber' | 'barber'

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
  email?: string
  address?: string
  openingHours?: string
  emergencyCallouts?: boolean
}

export interface BuilderState {
  trade: TradeConfig | null
  business: BusinessInfo
  selections: Record<SectionType, string>
}

export type StyleTheme = 'modern' | 'industrial' | 'classic' | 'fresh' | 'warm'

export interface SiteConfig {
  tradeId: TradeId
  styleTheme: StyleTheme
  showStickyBar: boolean
  business: BusinessInfo
  sections: Partial<Record<SectionType, string>>
  services: string[]
  primaryColour: string
  logoPath: string
  heroImagePath: string
  social: { facebook: string; instagram: string }
  meta: { title: string; description: string; slug: string }
  mode: 'site' | 'builder'
}
