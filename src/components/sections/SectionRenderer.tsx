import { useMemo } from 'react'
import type { TradeConfig } from '../../types'
import type { Site } from '../../site/schema'
import { resolveContent } from '../../site/resolve'
import type { RenderMode } from '../../site/resolve'
import type { SectionProps } from './types'
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
import { GalleryMasonry } from './GalleryMasonry'
import { GalleryRow } from './GalleryRow'
import { CertsProminent } from './CertsProminent'
import { CertsBadges } from './CertsBadges'

const COMPONENTS: Record<string, React.ComponentType<SectionProps>> = {
  HeroDark,
  HeroSplit,
  TrustBarScroll,
  TrustGrid,
  ServicesGrid,
  ServicesList,
  AboutPhotoLed,
  WhyUsFeatures,
  ReviewsCarousel,
  AreasGrid,
  ContactFull,
  ContactSimple,
  GalleryMasonry,
  GalleryRow,
  CertsProminent,
  CertsBadges,
}

interface Props {
  componentName: string
  site: Site
  trade: TradeConfig
  mode: RenderMode
}

export function SectionRenderer({ componentName, site, trade, mode }: Props) {
  const content = useMemo(() => resolveContent(site, trade, mode), [site, trade, mode])
  const Component = COMPONENTS[componentName]
  if (!Component) return <div style={{ padding: '20px', color: 'var(--muted)', fontSize: '13px' }}>Unknown section: {componentName}</div>
  return <Component business={site.business} trade={trade} content={content} mode={mode} />
}
