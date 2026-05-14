import type { BusinessInfo, TradeConfig } from '../../types'
import { Button } from '../ui/Button'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

export function ContactForm({ business, trade }: Props) {
  return (
    <section style={{ padding: '64px 32px', backgroundColor: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--color-text)' }}>
          {trade.ctaText}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '36px' }}>{trade.ctaSubtext}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(['Your Name', 'Phone Number', 'Email Address'] as const).map(placeholder => (
            <input
              key={placeholder}
              placeholder={placeholder}
              readOnly
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1.5px solid #e2e8f0',
                fontSize: '1rem',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-muted)',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          ))}
          <textarea
            placeholder="Describe the job…"
            readOnly
            rows={4}
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              border: '1.5px solid #e2e8f0',
              fontSize: '1rem',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-muted)',
              resize: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              width: '100%',
            }}
          />
          <Button size="lg" fullWidth>{trade.ctaText}</Button>
        </div>
        {business.phone && (
          <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--color-text-muted)' }}>
            Or call us directly: <strong style={{ color: 'var(--color-text)' }}>{business.phone}</strong>
          </p>
        )}
      </div>
    </section>
  )
}
