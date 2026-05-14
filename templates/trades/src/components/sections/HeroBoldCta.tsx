import type { BusinessInfo, TradeConfig } from '../../types'
import { Button } from '../ui/Button'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function HeroBoldCta({ business, trade }: Props) {
  return (
    <section style={{
      backgroundColor: 'var(--color-primary)',
      color: '#fff',
      padding: '72px 32px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8, marginBottom: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {business.location || 'Your City'} • Local {trade.name}
      </p>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.02em' }}>
        {business.name || `Your ${trade.name} Business`}
      </h1>
      <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '560px', margin: '0 auto 32px' }}>
        {trade.tagline}
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button size="lg" style={{ backgroundColor: '#fff', color: 'var(--color-primary)', border: 'none' }}>
          {trade.ctaText}
        </Button>
        {business.phone && (
          <Button size="lg" variant="outline" style={{ borderColor: 'rgba(255,255,255,0.6)', color: '#fff' }}>
            Call {business.phone}
          </Button>
        )}
      </div>
      <p style={{ marginTop: '16px', opacity: 0.75, fontSize: '0.9rem' }}>{trade.ctaSubtext}</p>
    </section>
  )
}
