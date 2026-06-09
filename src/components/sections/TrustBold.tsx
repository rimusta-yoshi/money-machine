import type { BusinessInfo, TradeConfig } from '../../types'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function TrustBold({ business, trade }: Props) {
  return (
    <section className="ff-trust-bold">
      <h2>Why {business.location || 'Local'} homeowners choose us</h2>
      <p className="sub">
        {business.yearsInBusiness
          ? `${business.yearsInBusiness} years of experience in the local area.`
          : 'Trusted by hundreds of homeowners in your neighbourhood.'}
      </p>
      <div className="tb-grid">
        {trade.trustSignals.map(signal => (
          <div className="tb-item" key={signal}>✓ {signal}</div>
        ))}
      </div>
    </section>
  )
}
