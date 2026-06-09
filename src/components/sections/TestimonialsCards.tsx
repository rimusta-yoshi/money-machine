const REVIEWS = [
  { initials: 'SM', name: 'Sarah M.', loc: 'Local area', text: 'Absolutely professional from start to finish. Would recommend to anyone in the area.' },
  { initials: 'JT', name: 'James T.', loc: 'Nearby', text: 'Quick response, fair price, and the work was spotless. Very happy.' },
  { initials: 'LK', name: 'Linda K.', loc: 'Local area', text: 'They came out the same day and sorted everything. Great local company.' },
]

export function TestimonialsCards() {
  return (
    <section className="ff-section alt">
      <div className="ff-section-head">
        <span className="ff-eyebrow">What our customers say</span>
        <h2>Real reviews from real homeowners.</h2>
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
