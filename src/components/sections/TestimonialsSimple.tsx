import type { BusinessInfo } from '../../types'

interface Props {
  business: BusinessInfo
}

export function TestimonialsSimple({ business }: Props) {
  return (
    <section className="ff-section">
      <div className="ff-rev-feature">
        <div className="ff-stars">★★★★★</div>
        <blockquote>"Best trade company we've used in {business.location || 'the area'}. Fast, clean, and honest pricing. Would recommend without hesitation."</blockquote>
        <div className="who">
          <div className="ava">HO</div>
          <div><b>Happy Homeowner</b><span>{business.location || 'Local Area'}</span></div>
        </div>
        <div className="ff-rev-strip">
          <div className="s"><b>4.9★</b><span>Rating</span></div>
          <div className="s"><b>312</b><span>Reviews</span></div>
          <div className="s"><b>98%</b><span>Recommend</span></div>
        </div>
      </div>
    </section>
  )
}
