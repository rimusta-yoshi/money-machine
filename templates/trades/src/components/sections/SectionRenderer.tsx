import type { BusinessInfo, TradeConfig } from '../../types'
import { HeroBoldCta } from './HeroBoldCta'
import { HeroSplit } from './HeroSplit'
import { ServicesCards } from './ServicesCards'
import { ServicesList } from './ServicesList'
import { GalleryMasonry } from './GalleryMasonry'
import { GalleryRow } from './GalleryRow'
import { TrustBold } from './TrustBold'
import { TrustBadges } from './TrustBadges'
import { CertsProminent } from './CertsProminent'
import { CertsBadges } from './CertsBadges'
import { TestimonialsCards } from './TestimonialsCards'
import { TestimonialsSimple } from './TestimonialsSimple'
import { ContactForm } from './ContactForm'
import { ContactSimple } from './ContactSimple'

interface Props {
  componentName: string
  business: BusinessInfo
  trade: TradeConfig
}

const COMPONENTS: Record<string, React.ComponentType<{ business: BusinessInfo; trade: TradeConfig }>> = {
  HeroBoldCta,
  HeroSplit,
  ServicesCards,
  ServicesList: (props) => <ServicesList trade={props.trade} />,
  GalleryMasonry: (props) => <GalleryMasonry trade={props.trade} />,
  GalleryRow: (props) => <GalleryRow trade={props.trade} />,
  TrustBold,
  TrustBadges: (props) => <TrustBadges trade={props.trade} />,
  CertsProminent: (props) => <CertsProminent trade={props.trade} />,
  CertsBadges: (props) => <CertsBadges trade={props.trade} />,
  TestimonialsCards,
  TestimonialsSimple: (props) => <TestimonialsSimple business={props.business} />,
  ContactForm,
  ContactSimple,
}

export function SectionRenderer({ componentName, business, trade }: Props) {
  const Component = COMPONENTS[componentName]
  if (!Component) return null
  return <Component business={business} trade={trade} />
}
