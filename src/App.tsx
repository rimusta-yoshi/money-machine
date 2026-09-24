import { useState, useEffect, useRef, useMemo, useReducer } from 'react'
import type { CSSProperties } from 'react'
import './builder/builder.css'
import type { TradeConfig } from './types'
import { trades, tradeById } from './trades'
import { siteReducer } from './site/reducer'
import { siteSections } from './site/sections'
import { SECTION_LABELS } from './site/labels'
import type { Site } from './site/schema'
import { TradeCard } from './builder/TradeCard'
import { SetupForm } from './builder/SetupForm'
import { BuilderCanvas } from './builder/BuilderCanvas'
import { BuilderTopBar } from './builder/BuilderTopBar'
import { Icon } from './components/ui/Icon'

type Step = 'pick-trade' | 'setup' | 'build'

function stepNumber(step: Step): 1 | 2 | 3 {
  if (step === 'pick-trade') return 1
  if (step === 'setup') return 2
  return 3
}

function darkenHex(hex: string, amount = 0.28): string {
  const h = hex.replace('#', '')
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount))
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount))
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export default function App() {
  const [step, setStep] = useState<Step>('pick-trade')
  const [site, dispatch] = useReducer(siteReducer, null)
  const [mobile, setMobile] = useState(false)
  const [done, setDone] = useState(false)
  const trade = site ? tradeById[site.tradeId] : null

  const handleGoStep = (n: 1 | 2) => {
    if (n === 1) setStep('pick-trade')
    if (n === 2 && site) setStep('setup')
  }
  const reset = () => {
    dispatch({ type: 'reset' })
    setStep('pick-trade')
    setDone(false)
  }

  const brandColor = site?.brandColor
  const cssVars = useMemo<CSSProperties | undefined>(() => {
    if (!trade || !brandColor) return undefined
    return {
      '--accent': brandColor,
      '--accent-ink': darkenHex(brandColor),
      '--navy': trade.colorScheme.navy,
    } as CSSProperties
  }, [trade, brandColor])

  return (
    <div className="mm-root" style={cssVars}>
      <BuilderTopBar
        step={stepNumber(step)}
        onGoStep={handleGoStep}
        trade={trade}
        mobile={mobile}
        setMobile={setMobile}
      />

      <div className={`mm-stage${mobile && step === 'build' ? ' prev-mobile' : ''}`}>
        <div className={`mm-wrap${step === 'build' ? ' wide' : ''}`}>

          {/* ---- STEP 1: Pick trade ---- */}
          {step === 'pick-trade' && (
            <>
              <div>
                <div className="mm-eyebrow">STEP <b>01</b> / 03 · PICK YOUR TRADE</div>
                <h1 className="mm-title">What do you do?</h1>
                <p className="mm-sub">
                  Pick your trade and we'll load a site built for it — the right services, the right words, the right look.
                </p>
              </div>

              <div className={`mm-trades${trade ? ' has-sel' : ''}`}>
                {trades.map(t => (
                  <TradeCard
                    key={t.id}
                    trade={t}
                    selected={trade?.id === t.id}
                    onClick={() => dispatch({ type: 'pickTrade', trade: t })}
                  />
                ))}
              </div>

              <div className="mm-dock">
                <span className="mm-dock-hint">
                  {trade
                    ? <>Loaded: <b style={{ color: 'var(--ink)' }}>{trade.name}</b> content &amp; theme</>
                    : 'Tap a trade to continue'}
                </span>
                <button
                  type="button"
                  className="mm-cta"
                  disabled={!trade}
                  onClick={() => setStep('setup')}
                >
                  {trade ? `Continue as ${trade.emoji} ${trade.name}` : 'Pick a trade'}
                  <Icon.Arrow size={18} />
                </button>
              </div>
            </>
          )}

          {/* ---- STEP 2: Setup form ---- */}
          {step === 'setup' && trade && site && (
            <SetupForm
              trade={trade}
              site={site}
              onBusinessChange={patch => dispatch({ type: 'setBusiness', patch })}
              onBrandColorChange={color => dispatch({ type: 'setBrandColor', color })}
              onToggleExtra={extra => dispatch({ type: 'toggleExtra', extra })}
              onSubmit={() => setStep('build')}
              onBack={() => setStep('pick-trade')}
            />
          )}

          {/* ---- STEP 3: Builder ---- */}
          {step === 'build' && trade && site && (
            <>
              <div className="mm-build-top">
                <div>
                  <div className="mm-eyebrow">STEP <b>03</b> / 03 · BUILD</div>
                  <h1 className="mm-title">Pick a layout for each section.</h1>
                  <p className="mm-sub" style={{ maxWidth: '46ch' }}>
                    Real layouts, filled with your content. Lock one in and the next section steps up.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  style={{
                    background: 'none',
                    border: '1.5px solid var(--line)',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    alignSelf: 'flex-end',
                  }}
                >
                  ← Start over
                </button>
              </div>

              <BuilderCanvas
                trade={trade}
                site={site}
                mobile={mobile}
                onSelect={(section, variantId) => dispatch({ type: 'select', section, variantId })}
                onDone={() => setDone(true)}
              />
            </>
          )}

        </div>
      </div>

      {/* Done overlay — only shown after all sections chosen; no StickyCallBar overlap risk */}
      {done && trade && site && (
        <DoneOverlay
          trade={trade}
          site={site}
          onBack={() => setDone(false)}
          onReset={reset}
        />
      )}
    </div>
  )
}

function DoneOverlay({
  trade,
  site,
  onBack,
  onReset,
}: {
  trade: TradeConfig
  site: Site
  onBack: () => void
  onReset: () => void
}) {
  const displayName = site.business.name.trim() || `${trade.name} Co.`
  const sections = siteSections(trade, site)
  const firstBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onBack])

  return (
    <div
      className="mm-done show"
      role="dialog"
      aria-modal="true"
      aria-labelledby="done-heading"
      style={{ '--accent': site.brandColor } as CSSProperties}
    >
      <div className="mm-done-inner">
        <div className="mm-done-badge">
          <Icon.Check size={14} /> Site assembled
        </div>
        <h1 id="done-heading">
          {displayName} is <em>ready to go live.</em>
        </h1>
        <p>
          {sections.length} sections, picked by you, themed and filled with real{' '}
          {trade.name.toLowerCase()} content. Publish now and share the link — or keep tweaking.
        </p>
        <div className="mm-done-recap">
          {sections.map(s => (
            <div key={s.type} className="mm-done-recap-item">
              <span className="chk"><Icon.Check size={13} /></span>
              {SECTION_LABELS[s.type]}
            </div>
          ))}
        </div>
        <div className="mm-done-actions">
          <button
            ref={firstBtnRef}
            type="button"
            className="mm-done-go"
            onClick={() => alert('Publishing coming soon!')}
          >
            <Icon.Arrow size={18} /> Publish my site
          </button>
          <button type="button" className="mm-done-back" onClick={onBack}>Keep editing</button>
          <button type="button" className="mm-done-back" onClick={onReset}>Start over</button>
        </div>
      </div>
    </div>
  )
}
