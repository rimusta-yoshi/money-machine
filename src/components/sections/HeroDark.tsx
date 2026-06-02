import type { BusinessInfo, TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function HeroDark({ business, trade }: Props) {
  const location = business.location || 'Your Area'
  const phone = business.phone || '—'

  const parts = trade.tagline.split(' ')
  const highlight = parts.slice(Math.floor(parts.length * 0.6)).join(' ')
  const before = parts.slice(0, Math.floor(parts.length * 0.6)).join(' ') + ' '

  return (
    <section style={{ backgroundColor: 'var(--navy)', color: '#fff', overflow: 'hidden' }}>
      {/* Photo placeholder */}
      <div style={{
        position: 'relative',
        background: `
          linear-gradient(180deg, rgba(11,37,69,0.45) 0%, rgba(11,37,69,0.92) 85%),
          repeating-linear-gradient(135deg, #1d3a66 0 14px, #1a3460 14px 28px)
        `,
        padding: '28px 18px 24px',
      }}>
        <div style={{
          position: 'absolute', top: '12px', left: '14px',
          background: 'rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '6px',
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase',
          border: '1px solid rgba(255,255,255,0.10)',
        }}>
          PHOTO · {trade.name.toLowerCase()} at work
        </div>

        {/* Status pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          padding: '6px 12px', borderRadius: '999px', marginBottom: '14px',
          background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
          fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
          backdropFilter: 'blur(6px)',
        }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '999px',
            background: 'var(--live)', boxShadow: '0 0 0 3px rgba(74,222,128,0.25)',
          }} />
          Available now · 24/7 emergency line
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '30px',
          lineHeight: 1.06, letterSpacing: '-0.025em', margin: '0 0 10px',
          color: '#fff',
        }}>
          {before}<em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>{highlight}</em>
        </h1>

        <p style={{
          fontSize: '14px', lineHeight: 1.5, color: 'rgba(255,255,255,0.82)',
          margin: '0 0 20px', maxWidth: '34ch',
        }}>
          {trade.ctaText} across {location}. {trade.ctaSubtext}.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <button style={{
            height: '52px', borderRadius: '14px', border: 'none',
            background: 'var(--accent)', color: '#fff',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: 'var(--shadow-cta)', cursor: 'pointer',
          }}>
            <Icon.Phone size={18} /> Call now · {phone}
          </button>
          <button style={{
            height: '48px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)',
            color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: 'pointer',
          }}>
            Get free quote <Icon.Arrow size={16} />
          </button>
        </div>

        {/* Trust card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)',
        }}>
          <div>
            <div style={{ color: 'var(--star)', fontSize: '13px', letterSpacing: '1px' }}>★★★★★</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', marginTop: '2px' }}>
              <strong style={{ color: '#fff' }}>4.9</strong> from 312 Google reviews
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', color: '#7DB9F0' }}>
            <Icon.Shield size={20} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>
              {trade.trustSignals[0]}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
