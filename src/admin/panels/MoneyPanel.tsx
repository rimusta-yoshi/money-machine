import { count, money, pct } from '../format'
import type { Money } from '../types'
import { Panel } from './Panel'

/** Sales, revenue, refunds, disputes, net and the refund rate, as plain numbers. */
export function MoneyPanel({ money: m }: { money: Money }) {
  const tiles: { label: string; value: string; detail?: string }[] = [
    { label: 'Sales', value: count(m.sales) },
    { label: 'Revenue', value: money(m.revenue) },
    { label: 'Refunds', value: count(m.refunds), detail: money(m.refunded) },
    { label: 'Disputes', value: count(m.disputes), detail: m.lostToDisputes ? `${money(m.lostToDisputes)} lost` : undefined },
    { label: 'Net', value: money(m.net) },
    { label: 'Refund rate', value: pct(m.refundRate) },
    { label: 'Stripe fees', value: money(m.stripeFees), detail: m.feesUnknown ? `${count(m.feesUnknown)} not known yet` : undefined },
    { label: 'Net after fees', value: money(m.netAfterFees) },
  ]
  return (
    <Panel title="Money" note="Full refunds and disputes count on the day they happened; partial refunds and Stripe’s fees count with their sale (Stripe keeps its fee on a refund).">
      <dl className="ad-tiles">
        {tiles.map(t => (
          <div key={t.label} className="ad-tile">
            <dt>{t.label}</dt>
            <dd><span className="ad-big">{t.value}</span>{t.detail && <span className="ad-detail">{t.detail}</span>}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
