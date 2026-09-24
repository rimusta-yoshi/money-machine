import { Icon } from '../ui/Icon'
import { SectionShell } from './parts'
import type { SectionProps } from './types'

type IconKey = keyof typeof Icon
const ICONS: IconKey[] = ['Shield', 'Badge', 'Check', 'Bolt', 'Star', 'Clock']

export function TrustGrid({ content }: SectionProps) {
  const { badges } = content
  if (!badges) return null

  return (
    <SectionShell className="ff-section alt ff-trust-grid" eyebrow="Why choose us" title="Trusted by local homeowners" example={badges.example}>
      <ul className="tg-grid">
        {badges.value.map((signal, i) => {
          const Ico = Icon[ICONS[i % ICONS.length]]
          return (
            <li className="tg-cell" key={signal}>
              <div className="ff-icon"><Ico size={20} /></div>
              <p>{signal}</p>
            </li>
          )
        })}
      </ul>
    </SectionShell>
  )
}
