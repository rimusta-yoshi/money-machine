import type { FunnelRow } from '../../analytics/funnel'
import { count, pct } from '../format'
import { Panel, ScrollBox } from './Panel'

interface Props {
  rows: FunnelRow[]
  afterPaying: { refunded: number; disputed: number }
}

/** Each step's count, its share of the step before and of everyone who landed; the biggest drop marked. */
export function FunnelPanel({ rows, afterPaying }: Props) {
  const drop = rows.find(r => r.biggestDrop)
  return (
    <Panel
      title="Funnel"
      wide
      note={drop ? <>Biggest drop: <b>{drop.label}</b> keeps {pct(drop.fromPrev)} of the step before.</> : 'Not enough visits in this range to see a drop yet.'}
    >
      <ScrollBox label="Funnel table">
        <table className="ad-table ad-funnel">
          <thead>
            <tr><th scope="col">Step</th><th scope="col" className="num">People</th><th scope="col" className="num">Of step before</th><th scope="col" className="num">Of landed</th><th scope="col" className="ad-bar-col"><span className="sb-sr-only">Share of landed, as a bar</span></th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.step} className={r.biggestDrop ? 'is-drop' : r.optional ? 'is-optional' : undefined}>
                <th scope="row">
                  {r.label}
                  {r.optional && <span className="ad-tag">optional</span>}
                  {r.biggestDrop && <span className="ad-tag ad-tag--drop">Biggest drop</span>}
                </th>
                <td className="num">{count(r.count)}</td>
                <td className="num">{pct(r.fromPrev)}</td>
                <td className="num">{pct(r.fromLanded)}</td>
                <td className="ad-bar-col" aria-hidden="true">
                  <span className="ad-meter"><span style={{ width: `${Math.min(100, (r.fromLanded ?? 0) * 100)}%` }} /></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollBox>
      <p className="ad-note">
        After paying: {count(afterPaying.refunded)} refunded, {count(afterPaying.disputed)} disputed. Preview shared is a side step, so
        Checkout started is measured from Build done.
      </p>
    </Panel>
  )
}
