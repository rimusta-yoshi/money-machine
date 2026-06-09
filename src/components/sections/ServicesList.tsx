import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

type IconKey = keyof typeof Icon
const SERVICE_ICONS: IconKey[] = ['Wrench', 'Bolt', 'Shield', 'Check', 'Star', 'Clock', 'Home', 'Truck']

export function ServicesList({ trade }: Props) {
  return (
    <section className="ff-section alt">
      <div className="ff-section-head">
        <span className="ff-eyebrow">Our services</span>
        <h2>Everything we cover.</h2>
        <p>Straight quotes. Qualified engineers. No surprises.</p>
      </div>
      <div className="ff-svc-list">
        {trade.services.map((service, i) => {
          const Ico = Icon[SERVICE_ICONS[i % SERVICE_ICONS.length]]
          return (
            <div className="ff-svc-row" key={service}>
              <div className="ff-icon"><Ico size={20} /></div>
              <div className="grow">
                <div className="ff-h-sm">{service}</div>
              </div>
              <div className="chev"><Icon.Arrow size={18} /></div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
