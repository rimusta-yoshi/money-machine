import type { BusinessInfo, TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function HeroSplit({ business, trade }: Props) {
  const location = business.location || 'Your Area'
  const phone = business.phone || '—'

  return (
    <section className="ff-hero-split">
      <div className="col-text">
        <span className="eb">{location} · Local {trade.name}</span>
        <h1>{trade.tagline.split(' ').slice(0, -2).join(' ')} <em>{trade.tagline.split(' ').slice(-2).join(' ')}</em></h1>
        <p className="sub">{trade.ctaText}. {trade.ctaSubtext}.</p>
        <ul className="split-bullets">
          {trade.trustSignals.slice(0, 3).map(s => (
            <li key={s}><Icon.Check size={16} /> {s}</li>
          ))}
        </ul>
        <div className="ff-cta-row">
          <button className="ff-btn ff-btn-primary" type="button">
            <Icon.Phone size={16} /> Call {phone}
          </button>
          <button className="ff-btn ff-btn-outline" type="button">
            Free quote <Icon.Arrow size={15} />
          </button>
        </div>
      </div>
      <div className="col-photo" data-label={`PHOTO · ${trade.name.toLowerCase()} project`} />
    </section>
  )
}
