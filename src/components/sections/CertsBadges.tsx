import type { TradeConfig } from '../../types'
import { Badge } from '../ui/Badge'

interface Props {
  trade: TradeConfig
}

export function CertsBadges({ trade }: Props) {
  return (
    <section style={{ padding: '36px 32px', backgroundColor: '#fffbeb', borderTop: '3px solid var(--color-primary)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)', marginBottom: '14px' }}>
          Licences & Certifications
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {trade.trustSignals.map(signal => (
            <Badge key={signal} icon="🏅">{signal}</Badge>
          ))}
        </div>
      </div>
    </section>
  )
}
