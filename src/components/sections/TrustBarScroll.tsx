import { Icon } from '../ui/Icon'
import { SectionShell } from './parts'
import type { SectionProps } from './types'

type Item = [keyof typeof Icon, string]

export function TrustBarScroll({ business, trade, content }: SectionProps) {
  const { badges, rating, emergency } = content
  const items: Item[] = [
    ...(badges?.value ?? []).map((b): Item => ['Shield', b]),
    ...(rating ? [['Star', `Rated ${rating.value.score} from ${rating.value.count} reviews`] as Item] : []),
    ...(emergency?.value ? [['Clock', 'Emergency call-outs'] as Item] : []),
  ]
  if (items.length === 0) return null
  const example = !!(badges?.example || rating?.example || emergency?.example)

  return (
    <SectionShell
      className="ff-trust"
      title={`Why choose ${business.name.trim() || `our ${trade.name.toLowerCase()} team`}`}
      hiddenTitle
    >
      <ul className="ff-trust-track">
        {items.map(([ic, label]) => {
          const Ico = Icon[ic]
          return (
            <li className="ff-trust-item" key={label}>
              <Ico size={16} /> {label}
            </li>
          )
        })}
        {example && <li className="ff-trust-item"><span className="ff-example">Example</span></li>}
      </ul>
    </SectionShell>
  )
}
