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
  const pivot = Math.floor(parts.length * 0.6)
  const before = parts.slice(0, pivot).join(' ') + (pivot > 0 ? ' ' : '')
  const highlight = parts.slice(pivot).join(' ')

  return (
    <section className="ff-hero">
      <div className="ff-hero-photo" data-label={`PHOTO · ${trade.name.toLowerCase()} at work`} />
      <div className="ff-hero-content">
        <div className="ff-hero-pill">
          <span className="dot" />
          Available now · 24/7 emergency line
        </div>
        <h1>{before}<em>{highlight}</em></h1>
        <p className="sub">{trade.ctaText} across {location}. {trade.ctaSubtext}.</p>
        <div className="ff-cta-row">
          <button className="ff-btn ff-btn-primary" type="button">
            <Icon.Phone size={18} /> Call now · {phone}
          </button>
          <button className="ff-btn ff-btn-ghost" type="button">
            Get free quote <Icon.Arrow size={16} />
          </button>
        </div>
        <div className="ff-hero-trust">
          <div>
            <div className="ff-stars">★★★★★</div>
            <div className="small"><strong>4.9</strong> from 312 Google reviews</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.8)' }}>
            <Icon.Shield size={18} />
            <span className="small">{trade.trustSignals[0]}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
