import type { BusinessInfo, TradeConfig } from '../types'
import { siteConfig } from '../config/siteConfig'
import { tradeById } from '../trades'
import { Header } from '../components/ui/Header'
import { Footer } from '../components/ui/Footer'
import { StickyCallBar } from '../components/ui/StickyCallBar'
import { HeroBoldCta } from '../components/sections/HeroBoldCta'
import { HeroSplit } from '../components/sections/HeroSplit'
import { ServicesCards } from '../components/sections/ServicesCards'
import { ServicesList } from '../components/sections/ServicesList'
import { GalleryMasonry } from '../components/sections/GalleryMasonry'
import { GalleryRow } from '../components/sections/GalleryRow'
import { TrustBold } from '../components/sections/TrustBold'
import { TrustBadges } from '../components/sections/TrustBadges'
import { CertsProminent } from '../components/sections/CertsProminent'
import { CertsBadges } from '../components/sections/CertsBadges'
import { TestimonialsCards } from '../components/sections/TestimonialsCards'
import { TestimonialsSimple } from '../components/sections/TestimonialsSimple'
import { ContactForm } from '../components/sections/ContactForm'
import { ContactSimple } from '../components/sections/ContactSimple'

type SectionProps = { business: BusinessInfo; trade: TradeConfig }

const SECTION_COMPONENTS: Record<string, React.ComponentType<SectionProps>> = {
  HeroBoldCta,
  ServicesCards,
  ServicesList,
  GalleryMasonry: ({ trade }) => <GalleryMasonry trade={trade} />,
  GalleryRow: ({ trade }) => <GalleryRow trade={trade} />,
  TrustBold,
  TrustBadges: ({ trade }) => <TrustBadges trade={trade} />,
  CertsProminent: ({ trade }) => <CertsProminent trade={trade} />,
  CertsBadges: ({ trade }) => <CertsBadges trade={trade} />,
  TestimonialsCards,
  TestimonialsSimple: ({ business }) => <TestimonialsSimple business={business} />,
  ContactForm,
  ContactSimple,
}

export function SiteRenderer() {
  const trade = tradeById[siteConfig.tradeId]

  // Merge form services over trade defaults when form supplied them
  const siteTrade: TradeConfig = {
    ...trade,
    services: siteConfig.services.length > 0 ? siteConfig.services : trade.services,
  }

  const business: BusinessInfo = siteConfig.business

  // Build a flat map: variantId → componentName, sourced from the trade's section configs
  const variantToComponent: Record<string, string> = {}
  for (const sectionConfig of siteTrade.sections) {
    for (const variant of sectionConfig.variants) {
      variantToComponent[variant.id] = variant.component
    }
  }

  // primaryColour override applied as inline CSS var on the root element
  const rootStyle: React.CSSProperties & Record<string, string> = {
    '--color-primary': siteConfig.primaryColour || 'var(--color-primary)',
  }

  return (
    <div data-theme={siteConfig.styleTheme} style={rootStyle}>
      <Header
        logoPath={siteConfig.logoPath}
        businessName={business.name}
        phone={business.phone}
      />

      {Object.entries(siteConfig.sections).map(([, variantId]) => {
        const componentName = variantToComponent[variantId]
        if (!componentName) return null

        // HeroSplit gets heroImagePath directly
        if (componentName === 'HeroSplit') {
          return (
            <HeroSplit
              key={variantId}
              business={business}
              trade={siteTrade}
              heroImagePath={siteConfig.heroImagePath || undefined}
            />
          )
        }

        const Component = SECTION_COMPONENTS[componentName]
        if (!Component) return null
        return <Component key={variantId} business={business} trade={siteTrade} />
      })}

      <Footer businessName={business.name} social={siteConfig.social} />

      {siteConfig.showStickyBar && business.phone && (
        <StickyCallBar phone={business.phone} ctaText={siteTrade.ctaText} />
      )}
    </div>
  )
}
