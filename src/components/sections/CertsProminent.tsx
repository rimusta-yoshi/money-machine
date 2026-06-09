import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

export function CertsProminent({ trade }: Props) {
  return (
    <section className="ff-section ff-certs-grid">
      <div className="ff-section-head">
        <span className="ff-eyebrow">Certified &amp; licensed</span>
        <h2>Our credentials mean your work is safe.</h2>
        <p>Every certificate on file. Available on request.</p>
      </div>
      <div className="certs-grid">
        {trade.trustSignals.map(signal => (
          <div className="cert-card" key={signal}>
            <div className="ff-icon"><Icon.Badge size={22} /></div>
            <p>{signal}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
