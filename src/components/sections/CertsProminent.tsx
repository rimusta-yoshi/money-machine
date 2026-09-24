import { Icon } from '../ui/Icon'
import { SectionShell } from './parts'
import type { SectionProps } from './types'

export function CertsProminent({ content }: SectionProps) {
  const { badges } = content
  if (!badges) return null

  return (
    <SectionShell
      className="ff-section ff-certs-grid"
      eyebrow="Certified & licensed"
      title="Our credentials mean your work is safe."
      sub="Certificates available on request."
      example={badges.example}
    >
      <ul className="certs-grid">
        {badges.value.map(signal => (
          <li className="cert-card" key={signal}>
            <div className="ff-icon"><Icon.Badge size={22} /></div>
            <p>{signal}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  )
}
