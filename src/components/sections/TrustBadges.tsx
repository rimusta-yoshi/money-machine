import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

export function TrustBadges({ trade }: Props) {
  return (
    <section className="ff-trust-badges">
      <p className="tb-label">Licences &amp; Certifications</p>
      <div className="tb-pills">
        {trade.trustSignals.map(signal => (
          <div className="tb-pill" key={signal}>
            <Icon.Badge size={14} /> {signal}
          </div>
        ))}
      </div>
    </section>
  )
}
