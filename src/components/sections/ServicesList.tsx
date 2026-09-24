import { Icon } from '../ui/Icon'
import { SectionShell } from './parts'
import type { SectionProps } from './types'

type IconKey = keyof typeof Icon
const SERVICE_ICONS: IconKey[] = ['Wrench', 'Bolt', 'Shield', 'Check', 'Star', 'Clock', 'Home', 'Truck']

export function ServicesList({ trade }: SectionProps) {
  return (
    <SectionShell
      className="ff-section alt"
      eyebrow="Our services"
      title="Everything we cover."
      sub="Straight quotes. Quality work. No surprises."
    >
      <ul className="ff-svc-list">
        {trade.services.map((service, i) => {
          const Ico = Icon[SERVICE_ICONS[i % SERVICE_ICONS.length]]
          return (
            <li className="ff-svc-row" key={service}>
              <div className="ff-icon"><Ico size={20} /></div>
              <div className="grow">
                <h3 className="ff-h-sm">{service}</h3>
              </div>
              <div className="chev"><Icon.Arrow size={18} /></div>
            </li>
          )
        })}
      </ul>
    </SectionShell>
  )
}
