import type { CSSProperties } from 'react'
import { Icon } from '../components/ui/Icon'
import type { TradeConfig } from '../types'

interface Props {
  step: 1 | 2 | 3
  onGoStep: (n: 1 | 2) => void
  trade: TradeConfig | null
  mobile: boolean
  setMobile: (v: boolean) => void
}

const STEPS = [
  { n: '01', t: 'Trade' },
  { n: '02', t: 'Details' },
  { n: '03', t: 'Build' },
]

export function BuilderTopBar({ step, onGoStep, trade, mobile, setMobile }: Props) {
  const accent = trade?.colorScheme.accent

  return (
    <div className="mm-bar" style={accent ? { '--accent': accent } as CSSProperties : undefined}>
      <div className="mm-brand">
        <div className="mm-brand-mark">
          <Icon.Bolt size={15} />
        </div>
        <div>
          <b>Money Machine</b>
          <span>SITE BUILDER</span>
        </div>
      </div>

      <div className="mm-steps">
        {STEPS.map((s, i) => {
          const idx = (i + 1) as 1 | 2 | 3
          const state = idx === step ? 'active' : idx < step ? 'done' : ''
          const canClick = idx < step && idx < 3
          return (
            <div key={s.n} style={{ display: 'contents' }}>
              {i > 0 && <div className="mm-steps-line" />}
              <button
                type="button"
                className={`mm-step ${state}${canClick ? ' clickable' : ''}`}
                onClick={() => canClick && onGoStep(idx as 1 | 2)}
                disabled={!canClick}
              >
                <span className="mm-step-n">
                  {idx < step ? <Icon.Check size={12} /> : s.n}
                </span>
                <span className="mm-step-t">{s.t}</span>
              </button>
            </div>
          )
        })}
      </div>

      <div className="mm-bar-right">
        {step === 3 && (
          <div className="mm-preview-toggle">
            <span className="mm-preview-label">Preview</span>
            <div className="mm-seg">
              <button type="button" className={!mobile ? 'on' : ''} onClick={() => setMobile(false)}>
                Desktop
              </button>
              <button type="button" className={mobile ? 'on' : ''} onClick={() => setMobile(true)}>
                Mobile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
