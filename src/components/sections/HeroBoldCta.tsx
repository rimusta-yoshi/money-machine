import type { BusinessInfo, TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function HeroBoldCta({ business, trade }: Props) {
  const location = business.location || 'Your Area'
  const phone = business.phone || '—'
  const parts = trade.tagline.split(' ')
  const pivot = Math.floor(parts.length * 0.6)
  const before = parts.slice(0, pivot).join(' ') + (pivot > 0 ? ' ' : '')
  const highlight = parts.slice(pivot).join(' ')

  return (
    <section className="ff-hero-bold">
      <span className="ff-eyebrow">{location} · Local {trade.name}</span>
      <h1>{before}<em>{highlight}</em></h1>
      <p className="sub">{trade.ctaText}. {trade.ctaSubtext}.</p>
      <div className="ff-cta-row">
        <button className="ff-btn ff-btn-primary" type="button">
          <Icon.Phone size={18} /> Call {phone}
        </button>
        <button className="ff-btn ff-btn-outline" type="button">
          Free quote <Icon.Arrow size={16} />
        </button>
      </div>
      <div className="band" data-label={`PHOTO · ${trade.name.toLowerCase()} at work`} />
    </section>
  )
}
