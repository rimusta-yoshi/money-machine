import type { BusinessInfo, TradeConfig } from '../../types'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function HeroSplit({ business, trade }: Props) {
  return (
    <section style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      minHeight: '480px',
    }}>
      <div style={{
        padding: '56px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: 'var(--color-surface)',
      }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
          {business.location || 'Local'} {trade.name}
        </p>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, lineHeight: 1.15, color: 'var(--color-text)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
          {business.name || `${trade.name} Services`}
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--color-text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
          {trade.tagline}
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <Button size="lg">{trade.ctaText}</Button>
          {business.phone && <Button size="lg" variant="outline">Call {business.phone}</Button>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {trade.trustSignals.slice(0, 2).map(s => <Badge key={s}>✓ {s}</Badge>)}
        </div>
      </div>
      <div style={{
        backgroundColor: '#d1d5db',
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280',
        fontWeight: 600,
        fontSize: '0.9rem',
      }}>
        Photo of your work
      </div>
    </section>
  )
}
