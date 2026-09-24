import { SectionShell } from './parts'
import type { SectionProps } from './types'

const PLACEHOLDERS = ['featured project', 'project 2', 'project 3', 'project 4', 'project 5', 'project 6']

export function GalleryMasonry({ content }: SectionProps) {
  const { gallery } = content.photos
  if (!gallery) return null

  return (
    <SectionShell
      className="ff-section ff-gal-masonry"
      eyebrow="Our work"
      title="Real results from real projects."
      sub="Recent jobs from around the area."
      example={gallery.example}
    >
      <ul className="ff-gal-grid">
        {gallery.example
          ? PLACEHOLDERS.map((label, i) => (
              <li className={`ff-gal-cell${i === 0 ? ' wide' : ''}`} key={label} aria-hidden="true">
                <span className="cap">PHOTO · {label}</span>
              </li>
            ))
          : gallery.value.map((photo, i) => (
              <li className={`ff-gal-cell${i === 0 ? ' wide' : ''}`} key={photo.url}>
                <img className="ff-photo-img" src={photo.url} alt={photo.alt} loading="lazy" />
              </li>
            ))}
      </ul>
    </SectionShell>
  )
}
