import type { BusinessInfo } from '../../types'

interface Props {
  business: BusinessInfo
}

export function TestimonialsSimple({ business }: Props) {
  return (
    <section style={{
      padding: '56px 32px',
      backgroundColor: 'var(--color-primary)',
      color: '#fff',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '1.5rem', fontWeight: 300, fontStyle: 'italic', maxWidth: '680px', margin: '0 auto 20px', lineHeight: 1.6 }}>
        "Best trade company we've used in {business.location || 'the area'}. Fast, clean, and honest pricing."
      </p>
      <p style={{ fontWeight: 700, opacity: 0.8 }}>— Happy Homeowner, {business.location || 'Local Area'}</p>
    </section>
  )
}
