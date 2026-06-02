const REVIEWS = [
  { initials: 'SM', name: 'Sarah M.', loc: 'Local area', text: 'Absolutely professional from start to finish. Fast response, fair price, no fuss. Would recommend to anyone.' },
  { initials: 'JO', name: 'James O.', loc: 'Nearby', text: 'Used them for a full job. Quote was clear, timeline was honest, finish is spotless. Already booked again.' },
  { initials: 'PK', name: 'Priya K.', loc: 'Local area', text: 'Called late on a Sunday. Answered immediately, came out, sorted it, and didn\'t overcharge for the callout.' },
  { initials: 'TR', name: 'Tom R.', loc: 'Nearby', text: 'Honest, polite, and properly skilled. Our regular from now on.' },
]

export function ReviewsCarousel() {
  return (
    <section style={{ backgroundColor: 'var(--surface)', padding: '36px 0 32px' }}>
      <div style={{ padding: '0 18px', marginBottom: '16px' }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
          textTransform: 'uppercase', letterSpacing: '0.14em',
          color: 'var(--accent-ink)', marginBottom: '8px',
        }}>
          What our customers say
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
          lineHeight: 1.15, color: 'var(--ink)', marginBottom: '10px',
        }}>
          312 reviews. Average 4.9 stars.
        </h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '999px' }}>
          <span style={{ color: 'var(--star)', fontSize: '13px' }}>★</span>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--ink)' }}>4.9 / 5</span>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>· 312 reviews</span>
        </div>
      </div>

      {/* Snap scroll carousel */}
      <div style={{
        display: 'flex', gap: '12px',
        padding: '2px 18px 6px', margin: '0',
        overflowX: 'auto', scrollSnapType: 'x mandatory',
        scrollbarWidth: 'none',
      }}>
        {REVIEWS.map((r, i) => (
          <div key={i} style={{
            flex: '0 0 86%', scrollSnapAlign: 'start',
            padding: '18px', borderRadius: '16px',
            border: '1px solid var(--line)', background: 'var(--bg)',
          }}>
            <div style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
              {[...Array(5)].map((_, j) => (
                <span key={j} style={{ color: 'var(--star)', fontSize: '14px' }}>★</span>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '14px', lineHeight: 1.45, color: 'var(--ink)', marginBottom: '14px' }}>
              "{r.text}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '999px',
                background: 'var(--navy)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px',
                flexShrink: 0,
              }}>
                {r.initials}
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>{r.name}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.02em', marginTop: '2px' }}>{r.loc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
