import { SectionShell } from './parts'
import type { SectionProps } from './types'

export function GalleryRow({ trade, content }: SectionProps) {
  const { gallery } = content.photos
  if (!gallery) return null

  return (
    <SectionShell className="ff-gal-row" eyebrow="Our work" title="Recent projects" example={gallery.example}>
      <ul className="ff-gal-scroll" tabIndex={0} aria-label="Project photos, scroll sideways for more">
        {gallery.example
          ? Array.from({ length: 5 }, (_, i) => (
              <li className="ff-gal-thumb" key={i} aria-hidden="true">
                <span className="cap">PHOTO · {trade.name.toLowerCase()} {i + 1}</span>
              </li>
            ))
          : gallery.value.map(photo => (
              <li className="ff-gal-thumb" key={photo.url}>
                <img className="ff-photo-img" src={photo.url} alt={photo.alt} loading="lazy" />
              </li>
            ))}
      </ul>
    </SectionShell>
  )
}
