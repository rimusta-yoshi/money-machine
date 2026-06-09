import { Icon } from '../ui/Icon'

type IconKey = keyof typeof Icon
const FEAT_ICONS: IconKey[] = ['Bolt', 'Tag', 'Shield', 'Sparkle', 'Chat', 'Check']

const DEFAULT_FEATURES = [
  ['Fast response', 'On site quickly for emergencies in our coverage area.'],
  ['Transparent pricing', 'Fixed quotes before any work starts. No hidden charges.'],
  ['Qualified & insured', 'Fully licensed, registered, and insured to £2m public liability.'],
  ['Clean workmanship', 'Dust sheets, proper tidy-up. We treat your home like ours.'],
  ['Reliable communication', 'Real-time updates, photos of the work, follow-up after every job.'],
]

export function WhyUsFeatures() {
  return (
    <section className="ff-section ff-features">
      <div className="ff-section-head">
        <span className="ff-eyebrow">Why choose us</span>
        <h2>Five things we get right, every job.</h2>
      </div>
      <div className="feat-list">
        {DEFAULT_FEATURES.map(([title, desc], i) => {
          const Ico = Icon[FEAT_ICONS[i % FEAT_ICONS.length]]
          return (
            <div className="feat-row" key={title}>
              <div className="ff-icon"><Ico size={20} /></div>
              <div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
