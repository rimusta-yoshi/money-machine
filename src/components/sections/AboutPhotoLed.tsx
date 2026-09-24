import { ExampleTag, PhotoSlot, SectionShell } from './parts'
import type { SectionProps } from './types'

type Stat = { n: string; l: string; example: boolean }

export function AboutPhotoLed({ business, trade, content, mode }: SectionProps) {
  const location = business.location.trim()
  const tradeName = trade.name.toLowerCase()
  const years = business.yearsInBusiness.trim()
  const { jobsDone, rating } = content

  const stats: Stat[] = [
    ...(years ? [{ n: years, l: 'Years local', example: false }] : mode === 'builder' ? [{ n: '10+', l: 'Years local', example: true }] : []),
    ...(jobsDone ? [{ n: jobsDone.value, l: 'Jobs done', example: jobsDone.example }] : []),
    ...(rating ? [{ n: `${rating.value.score}★`, l: `${rating.value.count} reviews`, example: rating.example }] : []),
  ]

  return (
    <SectionShell
      className="ff-section alt ff-about-photo"
      eyebrow="About us"
      title={location ? `Local ${tradeName} in ${location}.` : `Your local ${tradeName} team.`}
    >
      <PhotoSlot photo={content.photos.about} className="about-photo" placeholder="team & van outside" />
      <p className="about-body">
        {business.about.trim() || `We're a local, independent ${tradeName} business. You deal with the same people from first call to finished job.`}
      </p>
      {stats.length > 0 && (
        <ul className="about-stats">
          {stats.map(s => (
            <li className="about-stat" key={s.l}>
              <span className="n">{s.n}</span>
              <span className="l">{s.l}</span>
              {s.example && <ExampleTag />}
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  )
}
