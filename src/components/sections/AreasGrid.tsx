import { Icon } from '../ui/Icon'
import { SectionShell } from './parts'
import type { SectionProps } from './types'

export function AreasGrid({ business, content, mode }: SectionProps) {
  const { areas } = content
  if (!areas) return null
  const baseLocation = business.location.trim() || 'your area'

  return (
    <SectionShell
      className="ff-section ff-areas"
      eyebrow="Where we work"
      title={`Covering ${baseLocation}.`}
      sub="Just outside? Give us a ring — we often can."
      example={areas.example}
    >
      <div className="a-content">
        <ul className="a-grid">
          {areas.value.map(name => (
            <li className="a-chip" key={name}>
              <div className="a-pin"><Icon.Pin size={14} /></div>
              <span className="a-name">{name}</span>
            </li>
          ))}
        </ul>
      </div>
      {mode === 'builder' && (
        <div className="a-map-wrap" aria-hidden="true">
          <div className="ff-map">
            <div className="pin" />
            <span className="cap">MAP · {baseLocation}</span>
          </div>
        </div>
      )}
    </SectionShell>
  )
}
