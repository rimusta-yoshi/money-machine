import type { TradeConfig } from '../types'

interface Props {
  trade: TradeConfig
  selected: boolean
  onClick: () => void
}

export function TradeCard({ trade, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '28px 24px',
        borderRadius: '14px',
        border: `2.5px solid ${selected ? trade.colorScheme.primary : '#e2e8f0'}`,
        backgroundColor: selected ? `${trade.colorScheme.primary}10` : '#fff',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        boxShadow: selected ? `0 0 0 4px ${trade.colorScheme.primary}20` : 'none',
      }}
    >
      <span style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{trade.emoji}</span>
      <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', marginBottom: '6px' }}>{trade.name}</h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{trade.tagline}</p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
        {trade.trustSignals.slice(0, 2).map(s => (
          <span key={s} style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: '9999px',
            backgroundColor: `${trade.colorScheme.primary}18`,
            color: trade.colorScheme.primary,
          }}>
            {s}
          </span>
        ))}
      </div>
    </button>
  )
}
