import type { BusinessInfo, TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function ContactSimple({ business, trade }: Props) {
  const phone = business.phone || '—'
  const location = business.location || 'your area'

  return (
    <section style={{ backgroundColor: 'var(--surface)', padding: '36px 18px 32px' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', marginBottom: '8px',
      }}>
        Get in touch
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
        lineHeight: 1.15, color: 'var(--ink)', marginBottom: '8px',
      }}>
        {trade.ctaText}
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.55, marginBottom: '24px' }}>
        {trade.ctaSubtext}. Serving {location}.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button style={{
          height: '52px', borderRadius: '14px', border: 'none',
          background: 'var(--accent)', color: '#fff',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          boxShadow: 'var(--shadow-cta)', cursor: 'pointer',
        }}>
          <Icon.Phone size={18} /> Call {phone}
        </button>
        <button style={{
          height: '48px', borderRadius: '14px',
          background: 'var(--bg)', border: '1.5px solid var(--line)',
          color: 'var(--navy)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          cursor: 'pointer',
        }}>
          <Icon.Mail size={16} /> Send a message <Icon.Arrow size={14} />
        </button>
      </div>
    </section>
  )
}
