import type { BusinessInfo, TradeConfig } from '../../types'
import { Button } from '../ui/Button'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function ContactSimple({ business, trade }: Props) {
  return (
    <section style={{
      padding: '64px 32px',
      backgroundColor: 'var(--color-surface)',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--color-text)' }}>
        Get in Touch
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '36px' }}>{trade.ctaSubtext}</p>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {business.phone && (
          <Button size="lg">📞 {business.phone}</Button>
        )}
        <Button size="lg" variant="outline">Send an Email</Button>
      </div>
      {business.location && (
        <p style={{ marginTop: '24px', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          Serving {business.location} and surrounding areas
        </p>
      )}
    </section>
  )
}
