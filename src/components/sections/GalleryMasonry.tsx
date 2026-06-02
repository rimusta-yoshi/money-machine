const PLACEHOLDER_COLORS = ['var(--accent-tint)', '#dde6f0', '#e8f1fb', '#d4e8d8', '#f0e8d4', '#e8d4e8']

export function GalleryMasonry() {
  return (
    <section style={{ padding: '36px 18px 32px', backgroundColor: 'var(--bg)' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', marginBottom: '8px',
      }}>
        Our work
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
        lineHeight: 1.15, color: 'var(--ink)', marginBottom: '8px',
      }}>
        Real results from real projects.
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '18px' }}>
        Every job photographed. No stock images, ever.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{
            backgroundColor: PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length],
            borderRadius: '14px', height: i % 3 === 0 ? '200px' : '160px',
            border: '1px solid var(--line)', position: 'relative', overflow: 'hidden',
            gridColumn: i === 0 ? 'span 2' : undefined,
          }}>
            <span style={{
              position: 'absolute', left: '10px', bottom: '8px',
              background: 'rgba(255,255,255,0.85)', padding: '4px 8px', borderRadius: '6px',
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--ink)', border: '1px solid var(--line)',
            }}>
              PHOTO · project {i + 1}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
