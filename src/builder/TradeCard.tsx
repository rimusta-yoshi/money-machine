import type { TradeConfig } from '../types'

interface Props {
  trade: TradeConfig
  selected: boolean
  onClick: () => void
}

export function TradeCard({ trade, selected, onClick }: Props) {
  const { accent, accentTint, accentInk } = trade.colorScheme
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '24px 20px',
        borderRadius: '16px',
        border: `2px solid ${selected ? accent : 'var(--line)'}`,
        backgroundColor: selected ? accentTint : 'var(--bg)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        boxShadow: selected ? `0 0 0 4px ${accent}25` : 'none',
        width: '100%',
      }}
    >
      <span style={{ fontSize: '2rem', marginBottom: '10px' }}>{trade.emoji}</span>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '5px', letterSpacing: '-0.01em' }}>{trade.name}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>{trade.tagline}</p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
        {trade.trustSignals.slice(0, 2).map(s => (
          <span key={s} style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: '999px',
            backgroundColor: accentTint,
            color: accentInk,
          }}>
            {s}
          </span>
        ))}
      </div>
    </button>
  )
}
