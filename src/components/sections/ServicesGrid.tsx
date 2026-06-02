import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

type IconKey = keyof typeof Icon
const SERVICE_ICONS: IconKey[] = ['Wrench', 'Bolt', 'Shield', 'Check', 'Star', 'Clock', 'Home', 'Truck']

export function ServicesGrid({ trade }: Props) {
  return (
    <section style={{ backgroundColor: 'var(--bg)', padding: '36px 18px 32px' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', display: 'block', marginBottom: '8px',
      }}>
        Our services
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
        lineHeight: 1.15, color: 'var(--ink)', marginBottom: '8px',
      }}>
        Whatever the job, we've got it covered.
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.55, marginBottom: '20px' }}>
        Professional {trade.name.toLowerCase()} services. Quoted straight, done properly.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {/* Urgent card */}
        <div style={{
          gridColumn: 'span 2',
          background: 'var(--navy)', borderRadius: '16px', padding: '16px',
          display: 'flex', alignItems: 'center', gap: '14px',
          cursor: 'pointer', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', right: '-40px', top: '-40px',
            width: '160px', height: '160px', borderRadius: '50%',
            background: 'rgba(30,136,229,0.18)', filter: 'blur(20px)',
            pointerEvents: 'none',
          }} />
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.10)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon.Bolt size={22} />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <p style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
              color: '#fff', marginBottom: '3px',
            }}>
              Emergency — 24/7
            </p>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>
              On site fast. No callout fee before 8pm.
            </p>
          </div>
          <div style={{
            width: '32px', height: '32px', borderRadius: '999px',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon.Arrow size={16} />
          </div>
        </div>

        {/* Service cards */}
        {trade.services.map((service, i) => {
          const IconComp = Icon[SERVICE_ICONS[i % SERVICE_ICONS.length]]
          return (
            <div key={service} style={{
              background: 'var(--bg)', border: '1px solid var(--line)',
              borderRadius: '16px', padding: '14px 12px',
              display: 'flex', flexDirection: 'column', gap: '10px',
              cursor: 'pointer', transition: 'box-shadow 0.15s',
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: 'var(--accent-tint)', color: 'var(--accent-ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconComp size={20} />
              </div>
              <p style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '14px', color: 'var(--ink)', lineHeight: 1.2,
              }}>
                {service}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
