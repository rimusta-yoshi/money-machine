import type { BusinessInfo, TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function HeroSplit({ business, trade }: Props) {
  const name = business.name || `${trade.name} Services`
  const location = business.location || 'Your Area'
  const phone = business.phone || '—'

  return (
    <section style={{ backgroundColor: 'var(--surface)', padding: '32px 18px 28px' }}>
      {/* Eyebrow */}
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', marginBottom: '10px',
      }}>
        {location} · Local {trade.name}
      </p>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: '28px', lineHeight: 1.08, letterSpacing: '-0.02em',
        color: 'var(--navy)', marginBottom: '10px',
      }}>
        {name}
      </h1>

      <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.55, marginBottom: '20px', maxWidth: '34ch' }}>
        {trade.tagline}
      </p>

      {/* Bullet trust signals */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {trade.trustSignals.slice(0, 3).map(s => (
          <li key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500 }}>
            <Icon.Check size={16} style={{ color: 'var(--accent)', flexShrink: 0 } as React.CSSProperties} /> {s}
          </li>
        ))}
      </ul>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button style={{
          flex: 1, minWidth: '140px', height: '48px', borderRadius: '12px', border: 'none',
          background: 'var(--accent)', color: '#fff',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          boxShadow: 'var(--shadow-cta)', cursor: 'pointer',
        }}>
          <Icon.Phone size={16} /> Call {phone}
        </button>
        <button style={{
          flex: 1, minWidth: '120px', height: '48px', borderRadius: '12px',
          background: 'var(--bg)', border: '1.5px solid var(--line)',
          color: 'var(--navy)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          cursor: 'pointer',
        }}>
          Free quote <Icon.Arrow size={15} />
        </button>
      </div>

      {/* Photo placeholder */}
      <div style={{
        height: '160px', borderRadius: '14px', position: 'relative', overflow: 'hidden',
        background: 'repeating-linear-gradient(135deg, var(--accent-tint) 0 12px, #fff 12px 24px)',
        border: '1px solid var(--line)',
      }}>
        <span style={{
          position: 'absolute', left: '12px', bottom: '10px',
          background: 'var(--bg)', padding: '5px 9px', borderRadius: '7px',
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--ink)', border: '1px solid var(--line)',
        }}>
          PHOTO · {trade.name.toLowerCase()} project
        </span>
      </div>
    </section>
  )
}
