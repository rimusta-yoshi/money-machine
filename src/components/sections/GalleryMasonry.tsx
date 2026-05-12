import type { TradeConfig } from '../../types'

const PLACEHOLDER_COLORS = ['#cbd5e1', '#d1d5db', '#c7d2fe', '#bbf7d0', '#fde68a', '#fecaca']

interface Props {
  trade: TradeConfig
}

export function GalleryMasonry({ trade }: Props) {
  const items = Array.from({ length: 6 }, (_, i) => i)

  return (
    <section style={{ padding: '64px 32px', backgroundColor: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '8px', color: 'var(--color-text)' }}>
          Our Work
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '40px' }}>
          Real results from real {trade.name.toLowerCase()} projects
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px',
        }}>
          {items.map(i => (
            <div key={i} style={{
              backgroundColor: PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length],
              borderRadius: '10px',
              height: i % 3 === 0 ? '240px' : '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#374151',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}>
              Project photo {i + 1}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
