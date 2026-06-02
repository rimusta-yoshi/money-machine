import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

type IconKey = keyof typeof Icon
const SERVICE_ICONS: IconKey[] = ['Wrench', 'Bolt', 'Shield', 'Check', 'Star', 'Clock', 'Home', 'Truck']

export function ServicesList({ trade }: Props) {
  return (
    <section style={{ backgroundColor: 'var(--surface)', padding: '36px 18px 32px' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', marginBottom: '8px',
      }}>
        Our services
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
        lineHeight: 1.15, color: 'var(--ink)', marginBottom: '18px',
      }}>
        What we do
      </h2>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--line)',
        borderRadius: '14px', overflow: 'hidden',
      }}>
        {trade.services.map((service, i) => {
          const IconComp = Icon[SERVICE_ICONS[i % SERVICE_ICONS.length]]
          return (
            <div key={service} style={{
              display: 'grid', gridTemplateColumns: '44px 1fr 24px',
              gap: '14px', alignItems: 'center',
              padding: '14px 16px',
              borderBottom: i < trade.services.length - 1 ? '1px solid var(--line)' : 'none',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '10px',
                background: 'var(--accent-tint)', color: 'var(--accent-ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconComp size={20} />
              </div>
              <p style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '14px', color: 'var(--ink)',
              }}>
                {service}
              </p>
              <Icon.Arrow size={16} style={{ color: 'var(--muted)' } as React.CSSProperties} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
