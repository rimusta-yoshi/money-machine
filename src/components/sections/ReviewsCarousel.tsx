const REVIEWS = [
  { initials: 'SM', name: 'Sarah M.', loc: 'Local area', text: 'Absolutely professional from start to finish. Fast response, fair price, no fuss. Would recommend to anyone.' },
  { initials: 'JO', name: 'James O.', loc: 'Nearby', text: 'Used them for a full job. Quote was clear, timeline was honest, finish is spotless. Already booked again.' },
  { initials: 'PK', name: 'Priya K.', loc: 'Local area', text: 'Called late on a Sunday. Answered immediately, came out, sorted it. Didn\'t overcharge for the callout.' },
  { initials: 'TR', name: 'Tom R.', loc: 'Nearby', text: 'Honest, polite, and properly skilled. Our regular from now on.' },
]

export function ReviewsCarousel() {
  return (
    <section className="ff-section">
      <div className="ff-section-head">
        <span className="ff-eyebrow">What our customers say</span>
        <h2>312 reviews. Average 4.9 stars.</h2>
        <p>Real feedback from homeowners in our area.</p>
      </div>
      <div className="ff-revs">
        {REVIEWS.map((r, i) => (
          <div className="ff-rev" key={i}>
            <div className="ff-stars">★★★★★</div>
            <p>"{r.text}"</p>
            <div className="who">
              <div className="ava">{r.initials}</div>
              <div><b>{r.name}</b><span>{r.loc}</span></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
