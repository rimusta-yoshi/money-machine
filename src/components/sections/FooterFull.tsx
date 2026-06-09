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
    <footer className="ff-footer">
      <div className="ft-lockup">
        <div className="ft-mark"><Icon.Home size={20} /></div>
        <div>
          <p className="ft-name">{name}</p>
          <p className="ft-tag">{trade.name.toUpperCase()} · {location.toUpperCase()}</p>
        </div>
      </div>
      <div className="ft-lines">
        <div className="ft-line"><Icon.Phone size={15} /> {phone}</div>
        <div className="ft-line"><Icon.Pin size={15} /> {location}</div>
      </div>
      <div className="ft-nav-wrap">
        <p className="ft-nav-label">Services</p>
        <div className="ft-nav">
          {trade.services.slice(0, 6).map(s => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </div>
      <div className="ft-copy">
        © 2026 {name} · Fully insured · Public liability £2m<br />
        Local {trade.name.toLowerCase()} serving {location}.
      </div>
    </footer>
  )
}
