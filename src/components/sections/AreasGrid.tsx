import type { BusinessInfo } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  business: BusinessInfo
}

const DEFAULT_AREAS = [
  ['Town Centre', 'Main area'],
  ['North District', 'N postcode'],
  ['East Side', 'E postcode'],
  ['West End', 'W postcode'],
  ['South Quarter', 'S postcode'],
  ['Old Town', 'OT postcode'],
  ['New Estate', 'NE postcode'],
  ['Riverside', 'RV postcode'],
]

export function AreasGrid({ business }: Props) {
  const baseLocation = business.location || 'Local Area'

  return (
    <section className="ff-section ff-areas">
      <div className="ff-section-head">
        <span className="ff-eyebrow">Where we work</span>
        <h2>Covering {baseLocation}.</h2>
        <p>Just outside? Give us a ring — we often can.</p>
      </div>
      <div className="a-content">
        <div className="a-grid">
          {DEFAULT_AREAS.map(([name, pc]) => (
            <div className="a-chip" key={name}>
              <div className="a-pin"><Icon.Pin size={14} /></div>
              <span className="a-name">{name}</span>
              <span className="a-pc">{pc}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="a-map-wrap">
        <div className="ff-map" data-label={`MAP · ${baseLocation}`}>
          <div className="pin" />
          <span className="cap">MAP · {baseLocation}</span>
        </div>
      </div>
    </section>
  )
}
