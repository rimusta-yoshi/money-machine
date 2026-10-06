import { useMemo } from 'react'
import type { ThemeKey } from '../gen'
import { GeneratedSection } from '../components/sections/GeneratedSection'
import { ScaledFrame } from '../components/ScaledFrame'
import { samplePhotos } from '../sample/photos'
import { withSamplePhotos } from '../sample/content'
import { createSite } from '../site/defaults'
import { sitePage } from '../site/page'
import { pageContent } from '../site/pageContent'
import { styleRecord } from '../site/style'
import { tradeById } from '../trades'
import type { TradeId } from '../types'

export interface SampleLook {
  trade: TradeId
  theme: ThemeKey
  brand: string
  /** Style seed: picks the ground, type preset, buttons and the hero layout. */
  seed: number
  name: string
  location: string
}

interface Props {
  look: SampleLook
  /** 1200 for the desktop layout, 390 for the phone layout. */
  width: number
  className?: string
  crop?: boolean
}

/**
 * An example site's hero, made by the real generator and themes from a made-up business.
 * Decorative: hidden from screen readers and inert, so its headings and buttons don't
 * clutter the homepage. The tile around it says what it is.
 */
export function SampleHero({ look, width, className, crop }: Props) {
  const view = useMemo(() => {
    const trade = tradeById[look.trade]
    const blank = createSite(trade, look.seed)
    const site = {
      ...blank,
      brandColor: look.brand,
      style: styleRecord(look.theme, look.brand, look.seed),
      business: { ...blank.business, name: look.name, location: look.location, phone: '01632 960 123' },
    }
    const content = withSamplePhotos(pageContent(site, trade), samplePhotos())
    const hero = sitePage(site, trade, { content }).find(s => s.type === 'hero')
    return hero ? { hero, style: site.style.resolved, content } : null
  }, [look])

  if (!view) return null
  return (
    <ScaledFrame width={width} className={className} crop={crop}>
      <div aria-hidden="true" inert>
        <GeneratedSection section={view.hero} style={view.style} content={view.content} />
      </div>
    </ScaledFrame>
  )
}
