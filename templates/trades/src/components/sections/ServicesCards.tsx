import type { BusinessInfo, TradeConfig } from '../../types'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function ServicesCards({ trade }: Props) {
  return (
    <section style={{ padding: '64px 32px', backgroundColor: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '8px', color: 'var(--color-text)' }}>
          Our Services
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '48px' }}>
          Everything you need, handled by local professionals
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
        }}>
          {trade.services.map(service => (
            <div key={service} style={{
              padding: '28px 20px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '10px' }}>🔧</div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>{service}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
