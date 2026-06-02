import type { BusinessInfo, TradeConfig } from '../../types'
import { HeroDark } from './HeroDark'
import { HeroSplit } from './HeroSplit'
import { TrustBarScroll } from './TrustBarScroll'
import { TrustGrid } from './TrustGrid'
import { ServicesGrid } from './ServicesGrid'
import { ServicesList } from './ServicesList'
import { AboutPhotoLed } from './AboutPhotoLed'
import { WhyUsFeatures } from './WhyUsFeatures'
import { ReviewsCarousel } from './ReviewsCarousel'
import { AreasGrid } from './AreasGrid'
import { ContactFull } from './ContactFull'
import { ContactSimple } from './ContactSimple'
import { FooterFull } from './FooterFull'
import { GalleryMasonry } from './GalleryMasonry'
import { GalleryRow } from './GalleryRow'
import { CertsProminent } from './CertsProminent'
import { CertsBadges } from './CertsBadges'

type SectionProps = { business: BusinessInfo; trade: TradeConfig }
type SectionComp = React.ComponentType<SectionProps>

const COMPONENTS: Record<string, SectionComp> = {
  HeroDark,
  HeroSplit,
  TrustBarScroll: ({ trade }) => <TrustBarScroll trade={trade} />,
  TrustGrid:      ({ trade }) => <TrustGrid trade={trade} />,
  ServicesGrid:   ({ trade }) => <ServicesGrid trade={trade} />,
  ServicesList:   ({ trade }) => <ServicesList trade={trade} />,
  AboutPhotoLed,
  WhyUsFeatures:  () => <WhyUsFeatures />,
  ReviewsCarousel: () => <ReviewsCarousel />,
  AreasGrid: ({ business }) => <AreasGrid business={business} />,
  ContactFull,
  ContactSimple,
  FooterFull,
  GalleryMasonry: () => <GalleryMasonry />,
  GalleryRow:     ({ trade }) => <GalleryRow trade={trade} />,
  CertsProminent: ({ trade }) => <CertsProminent trade={trade} />,
  CertsBadges:    ({ trade }) => <CertsBadges trade={trade} />,
}

interface Props {
  componentName: string
  business: BusinessInfo
  trade: TradeConfig
}

export function SectionRenderer({ componentName, business, trade }: Props) {
  const Component = COMPONENTS[componentName]
  if (!Component) return <div style={{ padding: '20px', color: 'var(--muted)', fontSize: '13px' }}>Unknown section: {componentName}</div>
  return <Component business={business} trade={trade} />
}
