import type { BusinessInfo, TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function ContactForm({ business, trade }: Props) {
  const phone = business.phone || '—'

  return (
    <section className="ff-section alt">
      <div className="ff-section-head">
        <span className="ff-eyebrow">Get in touch</span>
        <h2>{trade.ctaText}</h2>
        <p>{trade.ctaSubtext}.</p>
      </div>
      <div className="ff-form">
        <div className="ff-field">
          <label>Your name</label>
          <input type="text" placeholder="e.g. Sarah Mitchell" readOnly />
        </div>
        <div className="ff-field">
          <label>Phone</label>
          <input type="tel" placeholder="07…" readOnly />
        </div>
        <div className="ff-field">
          <label>Tell us a bit more</label>
          <textarea placeholder="Describe the job…" rows={3} readOnly />
        </div>
        <button type="button" className="ff-btn ff-btn-primary" style={{ width: '100%' }}>
          <Icon.Phone size={18} /> Call {phone}
        </button>
      </div>
    </section>
  )
}
