import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

export function TrustBarScroll({ trade }: Props) {
  const items: [keyof typeof Icon, string][] = [
    ['Shield', trade.trustSignals[0] || 'Fully insured'],
    ['Badge', 'Qualified & certified'],
    ['Star', '4.9 Google rating'],
    ['Clock', '24/7 emergency'],
    ['Check', '312 local reviews'],
    ['Phone', 'Same-day response'],
  ]

  return (
    <section className="ff-trust">
      <div className="ff-trust-track">
        {items.map(([ic, label]) => {
          const Ico = Icon[ic]
          return (
            <div className="ff-trust-item" key={label}>
              <Ico size={16} /> {label}
            </div>
          )
        })}
      </div>
    </section>
  )
}
