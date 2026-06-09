import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

type IconKey = keyof typeof Icon
const SERVICE_ICONS: IconKey[] = ['Wrench', 'Bolt', 'Shield', 'Check', 'Star', 'Clock', 'Home', 'Truck']

export function ServicesGrid({ trade }: Props) {
  return (
    <section className="ff-section">
      <div className="ff-section-head">
        <span className="ff-eyebrow">Our services</span>
        <h2>Whatever the job, we've got it covered.</h2>
        <p>Professional {trade.name.toLowerCase()} services. Quoted straight, done properly.</p>
      </div>
      <div className="ff-services">
        <div className="ff-service urgent">
          <div className="ff-icon"><Icon.Bolt size={22} /></div>
          <div className="urgent-grow">
            <div className="ff-h-sm">Emergency — 24/7</div>
            <div className="desc">On site fast. No callout fee before 8pm.</div>
          </div>
          <div className="ff-icon-arrow"><Icon.Arrow size={16} /></div>
        </div>
        {trade.services.map((service, i) => {
          const Ico = Icon[SERVICE_ICONS[i % SERVICE_ICONS.length]]
          return (
            <div className="ff-service" key={service}>
              <div className="ff-icon"><Ico size={20} /></div>
              <div className="ff-h-sm">{service}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
