import type { BusinessInfo, TradeConfig } from '../../types'

const REVIEWS = [
  { name: 'Sarah M.', rating: 5, text: 'Absolutely professional from start to finish. Would recommend to anyone in the area.' },
  { name: 'James T.', rating: 5, text: 'Quick response, fair price, and the work was spotless. Very happy.' },
  { name: 'Linda K.', rating: 5, text: 'They came out the same day and sorted everything. Great local company.' },
]

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function TestimonialsCards({ business }: Props) {
  return (
    <section style={{ padding: '64px 32px', backgroundColor: 'var(--color-surface)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--color-text)' }}>
          What Our Customers Say
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '40px' }}>
          Real reviews from real {business.location || 'local'} homeowners
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
        }}>
          {REVIEWS.map((review, i) => (
            <div key={i} style={{
              backgroundColor: 'var(--color-bg)',
              borderRadius: '10px',
              padding: '28px 24px',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ color: '#f59e0b', fontSize: '1.1rem', marginBottom: '12px' }}>
                {'★'.repeat(review.rating)}
              </div>
              <p style={{ color: 'var(--color-text)', lineHeight: 1.65, marginBottom: '16px', fontStyle: 'italic' }}>
                "{review.text}"
              </p>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>— {review.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
