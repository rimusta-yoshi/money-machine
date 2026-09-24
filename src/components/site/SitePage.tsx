import { useMemo } from 'react'
import type { TradeConfig } from '../../types'
import type { Site } from '../../site/schema'
import { resolveContent } from '../../site/resolve'
import type { RenderMode } from '../../site/resolve'
import { siteSections } from '../../site/sections'
import { siteTheme } from '../../site/theme'
import { SectionRenderer } from '../sections/SectionRenderer'
import { FooterFull } from '../sections/FooterFull'
import { PhoneLink } from '../sections/parts'
import { Icon } from '../ui/Icon'
import '../sections/sections.css'

interface Props {
  site: Site
  trade: TradeConfig
  mode: RenderMode
}

/**
 * A complete customer site: skip link, header, main content and footer.
 * This is what gets published; the builder shows the same sections one at a time.
 */
export function SitePage({ site, trade, mode }: Props) {
  const content = useMemo(() => resolveContent(site, trade, mode), [site, trade, mode])
  const name = site.business.name.trim() || `${trade.name} Co.`

  return (
    <div className="ff-scope ff-page" style={siteTheme(site.brandColor, trade.colorScheme.navy)}>
      <a className="ff-skip" href="#main">Skip to main content</a>
      <header className="ff-site-header">
        <p className="ff-site-name">{name}</p>
        <PhoneLink phone={site.business.phone} className="ff-site-call">
          <Icon.Phone size={16} /> {site.business.phone}
        </PhoneLink>
      </header>
      <main id="main" tabIndex={-1}>
        {siteSections(trade, site).map(sec => {
          const variant = sec.variants.find(v => v.id === site.selections[sec.type])
            ?? sec.variants.find(v => v.id === sec.recommended)
            ?? sec.variants[0]
          return <SectionRenderer key={sec.type} componentName={variant.component} site={site} trade={trade} mode={mode} />
        })}
      </main>
      <FooterFull business={site.business} trade={trade} content={content} mode={mode} />
    </div>
  )
}
