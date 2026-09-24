import { Icon } from '../ui/Icon'
import { ExampleTag, SectionShell } from './parts'
import type { SectionProps } from './types'

type IconKey = keyof typeof Icon
const SERVICE_ICONS: IconKey[] = ['Wrench', 'Bolt', 'Shield', 'Check', 'Star', 'Clock', 'Home', 'Truck']

export function ServicesGrid({ trade, content }: SectionProps) {
  const { emergency } = content

  return (
    <SectionShell
      className="ff-section"
      eyebrow="Our services"
      title="Whatever the job, we've got it covered."
      sub={`Professional ${trade.name.toLowerCase()} services. Quoted straight, done properly.`}
    >
      <ul className="ff-services">
        {emergency?.value && (
          <li className="ff-service urgent">
            <div className="ff-icon"><Icon.Bolt size={22} /></div>
            <div className="urgent-grow">
              <h3 className="ff-h-sm">Emergency call-outs</h3>
              <p className="desc">Fast help when you need it most. {emergency.example && <ExampleTag />}</p>
            </div>
            <div className="ff-icon-arrow"><Icon.Arrow size={16} /></div>
          </li>
        )}
        {trade.services.map((service, i) => {
          const Ico = Icon[SERVICE_ICONS[i % SERVICE_ICONS.length]]
          return (
            <li className="ff-service" key={service}>
              <div className="ff-icon"><Ico size={20} /></div>
              <h3 className="ff-h-sm">{service}</h3>
            </li>
          )
        })}
      </ul>
    </SectionShell>
  )
}
