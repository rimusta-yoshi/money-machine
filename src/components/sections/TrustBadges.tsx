import type { TradeConfig } from '../../types'
import { Badge } from '../ui/Badge'

interface Props {
  trade: TradeConfig
}

export function TrustBadges({ trade }: Props) {
  return (
    <section style={{ padding: '40px 32px', backgroundColor: 'var(--color-surface)', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{
        maxWidth: '960px',
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {trade.trustSignals.map(signal => (
          <Badge key={signal} icon="✓">{signal}</Badge>
        ))}
      </div>
    </section>
  )
}
