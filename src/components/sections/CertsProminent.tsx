import type { TradeConfig } from '../../types'

interface Props {
  trade: TradeConfig
}

export function CertsProminent({ trade }: Props) {
  return (
    <section style={{ padding: '64px 32px', backgroundColor: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--color-text)' }}>
          Certified & Fully Licensed
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '48px' }}>
          Our credentials mean your work meets every safety standard
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '20px',
        }}>
          {trade.trustSignals.map(signal => (
            <div key={signal} style={{
              padding: '32px 20px',
              border: '2px solid var(--color-primary)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '2rem' }}>🏅</span>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)', textAlign: 'center' }}>{signal}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
