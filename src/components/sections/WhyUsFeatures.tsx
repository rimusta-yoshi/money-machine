import { Icon } from '../ui/Icon'
import { SectionShell } from './parts'

type IconKey = keyof typeof Icon
const FEAT_ICONS: IconKey[] = ['Bolt', 'Tag', 'Shield', 'Sparkle', 'Chat', 'Check']

const FEATURES = [
  ['Quick to respond', 'We get back to you fast and turn up when we say we will.'],
  ['Clear pricing', 'A straightforward quote before any work starts. No hidden charges.'],
  ['Properly qualified', 'Trained, experienced and insured for the work we do.'],
  ['Clean and tidy', 'Dust sheets down, mess cleared up. We treat your home like ours.'],
  ['Kept in the loop', 'Updates as the job goes, and a follow-up once it’s done.'],
]

export function WhyUsFeatures() {
  return (
    <SectionShell className="ff-section ff-features" eyebrow="Why choose us" title="Five things we get right, every job.">
      <ul className="feat-list">
        {FEATURES.map(([title, desc], i) => {
          const Ico = Icon[FEAT_ICONS[i % FEAT_ICONS.length]]
          return (
            <li className="feat-row" key={title}>
              <div className="ff-icon"><Ico size={20} /></div>
              <div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </SectionShell>
  )
}
