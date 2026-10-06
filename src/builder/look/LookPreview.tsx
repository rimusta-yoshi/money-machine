import { useMemo } from 'react'
import type { PageContent } from '../../gen'
import type { TradeConfig } from '../../types'
import type { Site } from '../../site/schema'
import { sitePage } from '../../site/page'
import { SECTION_NEEDS } from '../../site/needs'
import { GeneratedSection } from '../../components/sections/GeneratedSection'
import { ScaledFrame } from '../../components/ScaledFrame'
import { ExampleSection } from '../ExampleSection'
import { useNarrow } from '../useNarrow'

interface Props {
  site: Site
  trade: TradeConfig
  /** The customer's content with sample photos in empty slots (see usePreviewContent). */
  content: PageContent
}

/** Desktop shows the desktop layout; phones show the phone layout, as customers will see it there. */
const DESK_W = 1200
const PHONE_W = 390

/**
 * The top of the site in the chosen style and colour, made by the real generator: the
 * hero, then the reviews (or a labelled example of them) when that extra is on.
 */
export function LookPreview({ site, trade, content }: Props) {
  const narrow = useNarrow()
  const page = useMemo(() => sitePage(site, trade, { content }), [site, trade, content])
  const hero = page.find(s => s.type === 'hero')
  const reviews = site.extras.includes('reviews') ? page.find(s => s.type === 'testimonials') : undefined
  const key = `${site.style.theme}-${site.style.seed}-${site.brandColor}`

  return (
    <section aria-label="Preview of your site" className="bl-preview">
      <div className="bl-frame sb-swap" key={key}>
        <ScaledFrame width={narrow ? PHONE_W : DESK_W} crop={narrow} className="bl-scaled">
          <div inert>
            {hero && <GeneratedSection section={hero} style={site.style.resolved} content={content} />}
            {site.extras.includes('reviews') && (reviews
              ? <GeneratedSection section={reviews} style={site.style.resolved} content={content} />
              : <ExampleSection type="testimonials" site={site} content={content} needs={SECTION_NEEDS.testimonials ?? 'Add your customer reviews to show this.'} />)}
          </div>
        </ScaledFrame>
      </div>
    </section>
  )
}
