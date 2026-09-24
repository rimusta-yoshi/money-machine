import { useId } from 'react'
import { Icon } from '../ui/Icon'
import { ExampleTag, PhoneLink, PhotoSlot } from './parts'
import { splitTagline } from './tagline'
import type { SectionProps } from './types'

export function HeroSplit({ business, trade, content }: SectionProps) {
  const headingId = useId()
  const location = business.location.trim()
  const words = trade.tagline.split(' ').length
  const [before, highlight] = splitTagline(trade.tagline, (words - 2) / words)
  const { badges } = content

  return (
    <section className="ff-hero-split" aria-labelledby={headingId}>
      <div className="col-text">
        <p className="eb">{location ? `${location} · ` : ''}Local {trade.name}</p>
        <h1 id={headingId}>{before}<em>{highlight}</em></h1>
        <p className="sub">{trade.ctaText}. {trade.ctaSubtext}.</p>
        {badges && (
          <ul className="split-bullets">
            {badges.value.slice(0, 3).map(s => (
              <li key={s}><Icon.Check size={16} /> {s}</li>
            ))}
            {badges.example && <li><ExampleTag /></li>}
          </ul>
        )}
        <div className="ff-cta-row">
          <PhoneLink phone={business.phone} className="ff-btn ff-btn-primary">
            <Icon.Phone size={16} /> Call {business.phone}
          </PhoneLink>
          <a className="ff-btn ff-btn-outline" href="#contact">
            Free quote <Icon.Arrow size={15} />
          </a>
        </div>
      </div>
      <PhotoSlot photo={content.photos.hero} className="col-photo" placeholder={`${trade.name.toLowerCase()} project`} />
    </section>
  )
}
