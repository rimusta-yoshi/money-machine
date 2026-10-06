import type { BusinessInfo, TradeConfig } from '../../types'

type Basics = Pick<BusinessInfo, 'name' | 'location' | 'phone'>

interface Props {
  trade: TradeConfig | null
  business: Basics
}

/** Desktop: "Your site, so far", a rough sketch of the top of the site that fills in as they type. */
export function BasicsPreview({ trade, business }: Props) {
  const town = business.location.trim()
  const phone = business.phone.trim()
  const tradeName = trade?.name ?? 'Your trade'
  return (
    <aside aria-label="Live preview" className="bb-preview">
      <p className="bb-preview-label">Your site, so far</p>
      <div className="bb-preview-site" aria-live="polite">
        <p className="bb-preview-trade">{tradeName}{town && ` · ${town}`}</p>
        <p className="bb-preview-name">{business.name.trim() || 'Your business name'}</p>
        <p className="bb-preview-blurb">
          {trade ? `Your local ${trade.name.toLowerCase()}${town ? ` in ${town}` : ''}. ${trade.offer}, fair prices.` : 'Pick your trade and we’ll fill in the right wording.'}
        </p>
        <div className="bb-preview-photo" aria-hidden="true" />
        <p className="bb-preview-call">{phone ? `Call ${phone}` : 'Call now'}</p>
      </div>
      <p className="bb-preview-next">Next you'll pick your colour and style.</p>
    </aside>
  )
}

/** Phones: a small card under the fields with the name, trade, town and number. */
export function BasicsPreviewCard({ trade, business }: Props & { trade: TradeConfig }) {
  const town = business.location.trim()
  const phone = business.phone.trim()
  return (
    <div className="bb-card" role="group" aria-label="Live preview">
      <span className="bb-card-mark" aria-hidden="true" />
      <span className="bb-card-text">
        <b>{business.name.trim() || 'Your business name'}</b>
        <span>{trade.name}{town && ` in ${town}`}{phone && ` · ${phone}`}</span>
      </span>
    </div>
  )
}
