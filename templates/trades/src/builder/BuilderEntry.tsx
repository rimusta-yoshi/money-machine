import { useState } from 'react'
import type { BusinessInfo, TradeConfig } from '../types'
import { trades } from '../trades'
import { TradeCard } from './TradeCard'
import { SetupForm } from './SetupForm'
import { BuilderCanvas } from './BuilderCanvas'
import { StickyCallBar } from '../components/ui/StickyCallBar'

type Step = 'pick-trade' | 'setup' | 'build'

export function BuilderEntry() {
  const [step, setStep] = useState<Step>('pick-trade')
  const [trade, setTrade] = useState<TradeConfig | null>(null)
  const [business, setBusiness] = useState<BusinessInfo | null>(null)

  const pickTrade = (t: TradeConfig) => setTrade(t)
  const continueToBuild = () => setStep('setup')
  const handleSetup = (info: BusinessInfo) => {
    setBusiness(info)
    setStep('build')
  }
  const reset = () => {
    setTrade(null)
    setBusiness(null)
    setStep('pick-trade')
  }

  const colors = trade?.colorScheme

  return (
    <>
      <style>{`
        :root {
          --color-primary: ${colors?.primary ?? '#2563eb'};
          --color-primary-dark: ${colors?.primaryDark ?? '#1d4ed8'};
          --color-accent: ${colors?.accent ?? '#1e293b'};
          --color-bg: ${colors?.bg ?? '#ffffff'};
          --color-surface: ${colors?.surface ?? '#f8fafc'};
          --color-text: ${colors?.text ?? '#0f172a'};
          --color-text-muted: ${colors?.textMuted ?? '#64748b'};
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #0f172a; }
        input:focus, textarea:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
      `}</style>

      {step === 'pick-trade' && (
        <div style={{ minHeight: '100vh', padding: '40px 24px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '12px' }}>
                Build your trade site
              </h1>
              <p style={{ fontSize: '1.15rem', color: '#64748b', maxWidth: '480px', margin: '0 auto' }}>
                Pick your trade and we'll generate a professional local website — built for quote requests.
              </p>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              {trades.map(t => (
                <TradeCard
                  key={t.id}
                  trade={t}
                  selected={trade?.id === t.id}
                  onClick={() => pickTrade(t)}
                />
              ))}
            </div>
            {trade && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={continueToBuild}
                  style={{
                    backgroundColor: trade.colorScheme.primary,
                    color: '#fff',
                    border: 'none',
                    padding: '16px 40px',
                    borderRadius: '10px',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    letterSpacing: '-0.01em',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Continue as {trade.emoji} {trade.name} →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'setup' && trade && (
        <SetupForm trade={trade} onSubmit={handleSetup} onBack={() => setStep('pick-trade')} />
      )}

      {step === 'build' && trade && business && (
        <>
          <BuilderCanvas trade={trade} business={business} onReset={reset} />
          {trade.stickyCallBar && business.phone && (
            <StickyCallBar phone={business.phone} ctaText={trade.ctaText} />
          )}
        </>
      )}
    </>
  )
}
