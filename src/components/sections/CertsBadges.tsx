import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

export function CertsBadges({ trade }: Props) {
  return (
    <section style={{ padding: '24px 18px', backgroundColor: 'var(--accent-tint)', borderTop: '2px solid var(--accent)' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--accent-ink)', marginBottom: '12px',
      }}>
        Licences &amp; Certifications
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {trade.trustSignals.map(signal => (
          <div key={signal} style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '7px 13px', borderRadius: '999px',
            background: 'var(--bg)', border: '1px solid var(--line)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px', color: 'var(--ink)',
          }}>
            <Icon.Badge size={14} style={{ color: 'var(--accent-ink)' } as React.CSSProperties} />
            {signal}
          </div>
        ))}
      </div>
    </section>
  )
}
