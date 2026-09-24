import { useId } from 'react'
import { Icon } from '../ui/Icon'
import { ExampleTag, PhoneLink, PhotoSlot, Stars } from './parts'
import { splitTagline } from './tagline'
import type { SectionProps } from './types'

export function HeroDark({ business, trade, content }: SectionProps) {
  const headingId = useId()
  const location = business.location.trim()
  const [before, highlight] = splitTagline(trade.tagline, 0.6)
  const { emergency, rating, badges } = content
  const badge = badges?.value[0]

  return (
    <section className="ff-hero" aria-labelledby={headingId}>
      <PhotoSlot photo={content.photos.hero} className="ff-hero-photo" placeholder={`${trade.name.toLowerCase()} at work`} />
      <div className="ff-hero-content">
        {emergency?.value && (
          <p className="ff-hero-pill">
            <span className="dot" aria-hidden="true" />
            Emergency call-outs available
            {emergency.example && <ExampleTag />}
          </p>
        )}
        <h1 id={headingId}>{before}<em>{highlight}</em></h1>
        <p className="sub">{trade.ctaText}{location ? ` across ${location}` : ''}. {trade.ctaSubtext}.</p>
        <div className="ff-cta-row">
          <PhoneLink phone={business.phone} className="ff-btn ff-btn-primary">
            <Icon.Phone size={18} /> Call now · {business.phone}
          </PhoneLink>
          <a className="ff-btn ff-btn-ghost" href="#contact">
            Get a free quote <Icon.Arrow size={16} />
          </a>
        </div>
        {(rating || badge) && (
          <div className="ff-hero-trust">
            {rating && (
              <div>
                <Stars score={rating.value.score} />
                <p className="small"><strong>{rating.value.score}</strong> from {rating.value.count} reviews</p>
              </div>
            )}
            {badge && (
              <p className="small ff-hero-badge">
                <Icon.Shield size={18} /> {badge}
              </p>
            )}
            {(rating?.example || badges?.example) && <ExampleTag />}
          </div>
        )}
      </div>
    </section>
  )
}
