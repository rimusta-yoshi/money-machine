import { Icon } from '../ui/Icon'
import { PhoneLink } from './parts'
import type { SectionProps } from './types'

export function FooterFull({ business, trade }: SectionProps) {
  const name = business.name.trim() || trade.name
  const location = business.location.trim()

  return (
    <footer className="ff-footer">
      <div className="ft-lockup">
        <div className="ft-mark"><Icon.Home size={20} /></div>
        <div>
          <p className="ft-name">{name}</p>
          <p className="ft-tag">{trade.name}{location ? ` · ${location}` : ''}</p>
        </div>
      </div>
      <ul className="ft-lines">
        <li className="ft-line">
          <Icon.Phone size={15} /> <PhoneLink phone={business.phone}>{business.phone}</PhoneLink>
        </li>
        {location && <li className="ft-line"><Icon.Pin size={15} /> {location}</li>}
      </ul>
      <div className="ft-nav-wrap">
        <p className="ft-nav-label">Services</p>
        <ul className="ft-nav">
          {trade.services.slice(0, 6).map(s => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <p className="ft-copy">
        © {new Date().getFullYear()} {name}
        {location && <><br />Local {trade.name.toLowerCase()} serving {location}.</>}
      </p>
    </footer>
  )
}
