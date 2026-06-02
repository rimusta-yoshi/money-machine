import type { TradeConfig } from '../../types'

interface Props {
  trade: TradeConfig
}

export function GalleryRow({ trade }: Props) {
  return (
    <section style={{ padding: '36px 0 32px', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ padding: '0 18px', marginBottom: '16px' }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
          textTransform: 'uppercase', letterSpacing: '0.14em',
          color: 'var(--accent-ink)', marginBottom: '8px',
        }}>
          Our work
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
          lineHeight: 1.15, color: 'var(--ink)',
        }}>
          Recent projects
        </h2>
      </div>
      <div style={{ display: 'flex', gap: '12px', paddingLeft: '18px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{
            flex: '0 0 240px', height: '180px', borderRadius: '14px',
            background: 'var(--accent-tint)', border: '1px solid var(--line)',
            position: 'relative', overflow: 'hidden',
          }}>
            <span style={{
              position: 'absolute', left: '10px', bottom: '8px',
              background: 'rgba(255,255,255,0.85)', padding: '4px 8px', borderRadius: '6px',
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--ink)', border: '1px solid var(--line)',
            }}>
              PHOTO · {trade.name.toLowerCase()} {i + 1}
            </span>
          </div>
        ))}
        <div style={{ flex: '0 0 18px' }} />
      </div>
    </section>
  )
}
