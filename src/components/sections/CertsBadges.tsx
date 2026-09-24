import { useId } from 'react'
import { Icon } from '../ui/Icon'
import { ExampleTag } from './parts'
import type { SectionProps } from './types'

export function CertsBadges({ content }: SectionProps) {
  const headingId = useId()
  const { badges } = content
  if (!badges) return null

  return (
    <section className="ff-certs-badges" aria-labelledby={headingId}>
      <h2 id={headingId} className="cb-label">Licences &amp; certifications</h2>
      {badges.example && <ExampleTag />}
      <ul className="cb-pills">
        {badges.value.map(signal => (
          <li className="cb-pill" key={signal}>
            <Icon.Badge size={14} /> {signal}
          </li>
        ))}
      </ul>
    </section>
  )
}
