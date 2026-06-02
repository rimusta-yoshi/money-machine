import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

export function CertsProminent({ trade }: Props) {
  return (
    <section style={{ padding: '36px 18px 32px', backgroundColor: 'var(--bg)' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', marginBottom: '8px',
      }}>
        Certified &amp; licensed
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
        lineHeight: 1.15, color: 'var(--ink)', marginBottom: '8px',
      }}>
        Our credentials mean your work is safe.
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>
        Every certificate on file. Available on request.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {trade.trustSignals.map(signal => (
          <div key={signal} style={{
            padding: '18px 14px', border: '2px solid var(--accent-tint)',
            borderRadius: '14px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '10px', textAlign: 'center',
            background: 'var(--bg)',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'var(--accent-tint)', color: 'var(--accent-ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.Badge size={22} />
            </div>
            <p style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px',
              color: 'var(--ink)', lineHeight: 1.3,
            }}>
              {signal}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
