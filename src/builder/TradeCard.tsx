import type { CSSProperties } from 'react'
import type { TradeConfig } from '../types'

interface Props {
  trade: TradeConfig
  selected: boolean
  onClick: () => void
}

export function TradeCard({ trade, selected, onClick }: Props) {
  const { accent } = trade.colorScheme

  return (
    <button
      type="button"
      className={`mm-trade${selected ? ' sel' : ''}`}
      style={{ '--tc': accent } as CSSProperties}
      onClick={onClick}
    >
      <div className="mm-trade-tick">
        <span aria-hidden>✓</span>
      </div>
      <div className="mm-trade-ico" aria-hidden="true">{trade.emoji}</div>
      <h3>{trade.name}</h3>
      <div className="mm-trade-desc">{trade.tagline}</div>
      <div className="mm-trade-meta">
        <span className="mm-trade-chip">{trade.sections.length} sections</span>
        <span className="mm-trade-chip">{trade.trustSignals[0]}</span>
        <span className="mm-trade-pick" aria-hidden="true">Pick {trade.name} →</span>
      </div>
    </button>
  )
}
