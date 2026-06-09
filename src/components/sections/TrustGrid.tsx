import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

type IconKey = keyof typeof Icon
const ICONS: IconKey[] = ['Shield', 'Badge', 'Check', 'Bolt', 'Star', 'Clock']

export function TrustGrid({ trade }: Props) {
  return (
    <section className="ff-section alt ff-trust-grid">
      <div className="ff-section-head">
        <span className="ff-eyebrow">Why choose us</span>
        <h2>Trusted by local homeowners</h2>
      </div>
      <div className="tg-grid">
        {trade.trustSignals.map((signal, i) => {
          const Ico = Icon[ICONS[i % ICONS.length]]
          return (
            <div className="tg-cell" key={signal}>
              <div className="ff-icon"><Ico size={20} /></div>
              <p>{signal}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
