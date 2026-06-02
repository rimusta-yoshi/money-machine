import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

type IconKey = keyof typeof Icon
const ICONS: IconKey[] = ['Shield', 'Badge', 'Check', 'Bolt', 'Star', 'Clock']

export function TrustGrid({ trade }: Props) {
  return (
    <section style={{ backgroundColor: 'var(--surface)', padding: '32px 18px' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', marginBottom: '14px',
      }}>
        Why choose us
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
        lineHeight: 1.15, letterSpacing: '-0.01em', color: 'var(--navy)', marginBottom: '18px',
      }}>
        Trusted by local homeowners
      </h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px',
      }}>
        {trade.trustSignals.map((signal, i) => {
          const IconComp = Icon[ICONS[i % ICONS.length]]
          return (
            <div key={signal} style={{
              background: 'var(--bg)', border: '1px solid var(--line)',
              borderRadius: '14px', padding: '14px',
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: 'var(--accent-tint)', color: 'var(--accent-ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '10px',
              }}>
                <IconComp size={20} />
              </div>
              <p style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px',
                color: 'var(--ink)', lineHeight: 1.3,
              }}>
                {signal}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
