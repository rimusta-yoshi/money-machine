import { Icon } from '../ui/Icon'
import { PhoneLink, SectionShell } from './parts'
import type { SectionProps } from './types'

export function ContactSimple({ business, trade }: SectionProps) {
  const location = business.location.trim() || 'your area'
  const email = business.email.trim()

  return (
    <SectionShell
      id="contact"
      className="ff-section alt ff-contact-simple"
      eyebrow="Get in touch"
      title={trade.ctaText}
      sub={`${trade.ctaSubtext}. Serving ${location}.`}
    >
      <div className="cs-ctas">
        <PhoneLink phone={business.phone} className="ff-btn ff-btn-primary">
          <Icon.Phone size={18} /> Call {business.phone}
        </PhoneLink>
        {email && (
          <a className="ff-btn ff-btn-outline" href={`mailto:${email}`}>
            <Icon.Mail size={16} /> Email us <Icon.Arrow size={14} />
          </a>
        )}
      </div>
    </SectionShell>
  )
}
