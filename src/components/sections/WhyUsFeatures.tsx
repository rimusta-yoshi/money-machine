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
    <section style={{ backgroundColor: 'var(--bg)', padding: '36px 18px 32px' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', marginBottom: '8px',
      }}>
        Why choose us
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
        lineHeight: 1.15, color: 'var(--ink)', marginBottom: '18px',
      }}>
        Five things we get right, every job.
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {DEFAULT_FEATURES.map(([title, desc], i) => {
          const IconComp = Icon[FEAT_ICONS[i % FEAT_ICONS.length]]
          return (
            <div key={title} style={{
              display: 'flex', gap: '12px', alignItems: 'flex-start',
              padding: '14px', background: 'var(--bg)',
              border: '1px solid var(--line)', borderRadius: '14px',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'var(--accent-tint)', color: 'var(--accent-ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <IconComp size={20} />
              </div>
              <div>
                <h4 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: '15px', color: 'var(--navy)', marginBottom: '3px',
                }}>
                  {title}
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.45 }}>
                  {desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
