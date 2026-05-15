import type { BusinessInfo, TradeConfig } from '../../types'
import { Button } from '../ui/Button'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function TrustBold({ business, trade }: Props) {
  return (
    <section style={{
      backgroundColor: 'var(--color-accent)',
      color: '#fff',
      padding: '64px 32px',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, marginBottom: '16px', letterSpacing: '-0.02em' }}>
        Why {business.location || 'Local'} Homeowners Choose Us
      </h2>
      <p style={{ opacity: 0.85, fontSize: '1.1rem', marginBottom: '40px', maxWidth: '560px', margin: '0 auto 40px' }}>
        {business.yearsInBusiness
          ? `${business.yearsInBusiness} years of experience in the local area.`
          : 'Trusted by hundreds of homeowners in your neighbourhood.'}
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '24px',
        maxWidth: '800px',
        margin: '0 auto 40px',
      }}>
        {trade.trustSignals.map(signal => (
          <div key={signal} style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: '10px',
            padding: '20px 16px',
            fontWeight: 700,
            fontSize: '1rem',
          }}>
            ✓ {signal}
          </div>
        ))}
      </div>
      <Button size="lg" style={{ backgroundColor: '#fff', color: 'var(--color-accent)', border: 'none' }}>
        {trade.ctaText}
      </Button>
    </section>
  )
}
