import type { TradeConfig } from '../../types'

const PLACEHOLDER_COLORS = ['#cbd5e1', '#d1d5db', '#c7d2fe', '#bbf7d0', '#fde68a']

interface Props {
  trade: TradeConfig
}

export function GalleryRow({ trade }: Props) {
  return (
    <section style={{ padding: '64px 0', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 32px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '32px', color: 'var(--color-text)' }}>
          Recent Projects
        </h2>
      </div>
      <div style={{ display: 'flex', gap: '16px', paddingLeft: '32px', overflowX: 'auto', paddingBottom: '8px' }}>
        {PLACEHOLDER_COLORS.map((color, i) => (
          <div key={i} style={{
            flex: '0 0 280px',
            height: '200px',
            backgroundColor: color,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#374151',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}>
            {trade.name} project {i + 1}
          </div>
        ))}
      </div>
    </section>
  )
}
