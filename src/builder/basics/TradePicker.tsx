import { useId } from 'react'
import type { Ref } from 'react'
import { trades } from '../../trades'
import type { TradeConfig, TradeId } from '../../types'

interface Props {
  value: TradeId | null
  onPick: (trade: TradeConfig) => void
  /** Tappable buttons in a wrap (desktop) or big full-width rows (phone). */
  variant: 'chips' | 'rows'
  legend: string
  /** Keep the legend for screen readers only, when a heading above already says it. */
  legendHidden?: boolean
  firstRef?: Ref<HTMLInputElement>
}

/** The trades as real radio buttons, styled as tappable tiles. Arrow keys move between them. */
export function TradePicker({ value, onPick, variant, legend, legendHidden, firstRef }: Props) {
  const name = useId()
  return (
    <fieldset className={`bb-trades bb-trades--${variant}`}>
      <legend className={legendHidden ? 'sb-sr-only' : 'bf-label'}>{legend}</legend>
      <div className="bb-trades-list">
        {trades.map((t, i) => (
          <label key={t.id} className={`bb-trade${value === t.id ? ' on' : ''}`}>
            <input
              ref={i === 0 ? firstRef : undefined}
              type="radio" name={name} value={t.id} className="sb-sr-only"
              checked={value === t.id} onChange={() => onPick(t)}
            />
            <span>{t.name}</span>
            {variant === 'rows' && <span className="bb-trade-dot" aria-hidden="true" />}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
