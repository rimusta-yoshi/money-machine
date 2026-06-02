import type { BusinessInfo } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  business: BusinessInfo
}

const DEFAULT_AREAS = [
  ['Town Centre', 'Main area'],
  ['North District', 'N postcode'],
  ['East Side', 'E postcode'],
  ['West End', 'W postcode'],
  ['South Quarter', 'S postcode'],
  ['Old Town', 'OT postcode'],
  ['New Estate', 'NE postcode'],
  ['Riverside', 'RV postcode'],
]

export function AreasGrid({ business }: Props) {
  const baseLocation = business.location || 'Local Area'

  return (
    <section style={{ backgroundColor: 'var(--bg)', padding: '36px 18px 32px' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', marginBottom: '8px',
      }}>
        Where we work
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
        lineHeight: 1.15, color: 'var(--ink)', marginBottom: '8px',
      }}>
        Covering {baseLocation}.
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.55, marginBottom: '18px' }}>
        Just outside? Give us a ring — we often can.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {DEFAULT_AREAS.map(([name, pc]) => (
          <div key={name} style={{
            background: 'var(--bg)', border: '1px solid var(--line)',
            borderRadius: '12px', padding: '12px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '7px',
              background: 'var(--accent-tint)', color: 'var(--accent-ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon.Pin size={14} />
            </div>
            <span style={{
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px', color: 'var(--ink)',
            }}>
              {name}
            </span>
            <span style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)',
              fontWeight: 500, letterSpacing: '0.04em',
            }}>
              {pc}
            </span>
          </div>
        ))}
      </div>

      {/* Map placeholder */}
      <div style={{
        height: '140px', borderRadius: '14px', marginTop: '14px',
        background: `
          radial-gradient(circle at 55% 50%, rgba(30,136,229,0.15) 0%, transparent 55%),
          repeating-linear-gradient(0deg, var(--line) 0 1px, transparent 1px 28px),
          repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 28px),
          var(--surface)
        `,
        border: '1px solid var(--line)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: '52%', top: '42%',
          width: '18px', height: '18px', borderRadius: '999px 999px 999px 0',
          background: 'var(--accent)', transform: 'rotate(-45deg)',
          boxShadow: '0 4px 10px rgba(30,136,229,0.4)',
        }} />
        <span style={{
          position: 'absolute', bottom: '10px', left: '12px',
          background: 'rgba(255,255,255,0.90)', padding: '5px 9px', borderRadius: '7px',
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--ink)', border: '1px solid var(--line)',
        }}>
          MAP · {baseLocation}
        </span>
      </div>
    </section>
  )
}
