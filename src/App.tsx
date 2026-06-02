import { useState } from 'react'
import type { BusinessInfo, TradeConfig } from './types'
import { trades } from './trades'
import { TradeCard } from './builder/TradeCard'
import { SetupForm } from './builder/SetupForm'
import { BuilderCanvas } from './builder/BuilderCanvas'
import { StickyCallBar } from './components/ui/StickyCallBar'

type Step = 'pick-trade' | 'setup' | 'build'

export default function App() {
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
          --navy:        ${colors?.navy        ?? '#0B2545'};
          --navy-2:      ${colors?.navyHover   ?? '#133762'};
          --accent:      ${colors?.accent      ?? '#1E88E5'};
          --accent-ink:  ${colors?.accentInk   ?? '#0B5BA8'};
          --accent-tint: ${colors?.accentTint  ?? '#E8F1FB'};
        }
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
                    backgroundColor: trade.colorScheme.accent,
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
            <StickyCallBar phone={business.phone} />
          )}
        </>
      )}
    </>
  )
}
