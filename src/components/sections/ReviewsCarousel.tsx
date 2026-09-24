import { SectionShell, Stars } from './parts'
import type { SectionProps } from './types'

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

export function ReviewsCarousel({ content }: SectionProps) {
  const { reviews, rating } = content
  if (!reviews) return null

  return (
    <SectionShell
      className="ff-section"
      eyebrow="What our customers say"
      title={rating ? `Rated ${rating.value.score} from ${rating.value.count} reviews.` : 'What our customers say.'}
      sub="Feedback from homeowners in our area."
      example={reviews.example || rating?.example}
    >
      <ul className="ff-revs" tabIndex={0} aria-label="Customer reviews, scroll sideways for more">
        {reviews.value.map((r, i) => (
          <li className="ff-rev" key={i}>
            <figure>
              <Stars score={r.rating} />
              <blockquote><p>"{r.text}"</p></blockquote>
              <figcaption className="who">
                <span className="ava" aria-hidden="true">{initials(r.author)}</span>
                <span><b>{r.author}</b>{r.location && <span>{r.location}</span>}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </SectionShell>
  )
}
