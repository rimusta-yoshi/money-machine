import type { TradeConfig } from '../../types'

interface Props {
  trade: TradeConfig
}

export function ServicesList({ trade }: Props) {
  return (
    <section style={{ padding: '64px 32px', backgroundColor: 'var(--color-surface)' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '32px', color: 'var(--color-text)' }}>
          What We Do
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {trade.services.map(service => (
            <li key={service} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 0',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--color-text)',
            }}>
              <span style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '1.2rem' }}>✓</span>
              {service}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
