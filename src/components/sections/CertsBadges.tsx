import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

export function CertsBadges({ trade }: Props) {
  return (
    <section className="ff-certs-badges">
      <p className="cb-label">Licences &amp; Certifications</p>
      <div className="cb-pills">
        {trade.trustSignals.map(signal => (
          <div className="cb-pill" key={signal}>
            <Icon.Badge size={14} /> {signal}
          </div>
        ))}
      </div>
    </section>
  )
}
