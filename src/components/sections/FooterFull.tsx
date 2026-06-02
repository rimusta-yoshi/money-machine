import type { BusinessInfo, TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function FooterFull({ business, trade }: Props) {
  const name = business.name || trade.name
  const phone = business.phone || '—'
  const location = business.location || 'Local Area'

  return (
    <footer style={{ backgroundColor: 'var(--navy)', color: 'rgba(255,255,255,0.85)', padding: '28px 18px 24px' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.10)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon.Home size={20} />
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '17px', color: '#fff', letterSpacing: '-0.02em' }}>{name}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>
            {trade.name.toUpperCase()} · {location.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Contact lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {[
          [<Icon.Phone size={15} />, phone],
          [<Icon.Pin size={15} />, location],
        ].map(([icon, val], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ color: 'var(--accent)' }}>{icon as React.ReactNode}</span>
            {val as string}
          </div>
        ))}
      </div>

      {/* Services nav */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.55)', marginBottom: '10px',
        }}>
          Services
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
          {trade.services.slice(0, 6).map(s => (
            <span key={s} style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Legal */}
      <div style={{
        paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.10)',
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, letterSpacing: '0.02em',
      }}>
        © 2026 {name} · Fully insured · Public liability £2m<br />
        Local {trade.name.toLowerCase()} serving {location}.
      </div>
    </footer>
  )
}
