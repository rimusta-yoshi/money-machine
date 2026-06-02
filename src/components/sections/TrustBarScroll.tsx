import type { TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  trade: TradeConfig
}

type IconKey = keyof typeof Icon

const ICONS: IconKey[] = ['Check', 'Pin', 'Bolt', 'Star', 'Badge', 'Truck']

export function TrustBarScroll({ trade }: Props) {
  return (
    <section style={{
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--line)',
      padding: '12px 0',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none',
        padding: '2px 18px',
      }}>
        {trade.trustSignals.map((signal, i) => {
          const IconComp = Icon[ICONS[i % ICONS.length]]
          return (
            <div key={signal} style={{
              flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 13px', borderRadius: '999px',
              background: 'var(--bg)', border: '1px solid var(--line)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px',
              color: 'var(--ink)', whiteSpace: 'nowrap',
            }}>
              <IconComp size={15} style={{ color: 'var(--accent)' } as React.CSSProperties} />
              {signal}
            </div>
          )
        })}
      </div>
    </section>
  )
}
