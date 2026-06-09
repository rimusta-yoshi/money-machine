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
    <section className="ff-section alt ff-contact-simple">
      <div className="ff-section-head">
        <span className="ff-eyebrow">Get in touch</span>
        <h2>{trade.ctaText}</h2>
        <p>{trade.ctaSubtext}. Serving {location}.</p>
      </div>
      <div className="cs-ctas">
        <button type="button" className="ff-btn ff-btn-primary">
          <Icon.Phone size={18} /> Call {phone}
        </button>
        <button type="button" className="ff-btn ff-btn-outline">
          <Icon.Mail size={16} /> Send a message <Icon.Arrow size={14} />
        </button>
      </div>
    </section>
  )
}
