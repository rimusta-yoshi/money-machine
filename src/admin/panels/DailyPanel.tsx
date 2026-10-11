import { useState } from 'react'
import type { Step } from '../../analytics/funnel'
import { count, DAY_MS, dayLabel } from '../format'
import { tzOffset } from '../range'
import type { Stats } from '../types'
import { Panel, ScrollBox } from './Panel'

/**
 * Landed, started and paid per day, as three small bar charts, each on its own scale (paid is
 * a far smaller number: one shared axis would flatten it). Hovering a day shows all three; the
 * same numbers are in a table underneath.
 */

const SERIES: { step: Step; label: string }[] = [
  { step: 'landed', label: 'Landed' }, { step: 'started', label: 'Started builder' }, { step: 'paid', label: 'Paid' },
]
/** All time on a busy site: the last year of days is plenty for a chart. */
const MAX_DAYS = 366
const W = 720
const H = 72

function dayRange(daily: Stats['daily'], range: Stats['range']): number[] {
  const offset = tzOffset(range.to) * 60_000
  const last = Math.floor((range.to + offset) / DAY_MS)
  const firstData = daily.reduce((min, d) => Math.min(min, d.day), last)
  const first = Math.max(range.from > 0 ? Math.floor((range.from + offset) / DAY_MS) : firstData, last - MAX_DAYS + 1)
  return Array.from({ length: last - first + 1 }, (_, i) => first + i)
}

function Bars({ values, label, hover, onHover }: { values: number[]; label: string; hover: number | null; onHover: (i: number | null) => void }) {
  const max = Math.max(1, ...values)
  const step = W / values.length
  const gap = step > 6 ? 2 : 0
  return (
    <div className="ad-mini">
      <p className="ad-mini-head"><span>{label}</span><span className="ad-detail">max {count(max)} a day</span></p>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="ad-mini-svg" aria-hidden="true" onMouseLeave={() => onHover(null)}>
        <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} className="ad-axis" />
        {values.map((v, i) => {
          const h = v ? Math.max(2, (v / max) * (H - 4)) : 0
          return (
            <g key={i} onMouseEnter={() => onHover(i)}>
              <rect x={i * step} y="0" width={step} height={H} className={hover === i ? 'ad-hit is-on' : 'ad-hit'} />
              {h > 0 && <rect x={i * step + gap / 2} y={H - h} width={Math.max(1, step - gap)} height={h} rx={Math.min(4, (step - gap) / 2)} className="ad-mark" />}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function DailyPanel({ daily, range }: { daily: Stats['daily']; range: Stats['range'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const days = dayRange(daily, range)
  const at = new Map(daily.map(d => [`${d.day}:${d.step}`, d.n]))
  const series = SERIES.map(s => ({ ...s, values: days.map(d => at.get(`${d}:${s.step}`) ?? 0) }))
  const shown = hover ?? days.length - 1
  return (
    <Panel title="Every day" wide note="Each chart has its own scale.">
      <p className="ad-readout" aria-live="polite">
        <b>{days.length ? dayLabel(days[shown]) : '–'}</b>
        {series.map(s => <span key={s.step}>{s.label}: <b>{count(s.values[shown] ?? 0)}</b></span>)}
      </p>
      <div className="ad-minis">
        {series.map(s => <Bars key={s.step} values={s.values} label={s.label} hover={hover} onHover={setHover} />)}
      </div>
      {days.length > 0 && <p className="ad-axis-labels" aria-hidden="true"><span>{dayLabel(days[0])}</span><span>{dayLabel(days[days.length - 1])}</span></p>}
      <details className="ad-details">
        <summary>Show as a table</summary>
        <ScrollBox label="Every day table" tall>
          <table className="ad-table">
            <thead><tr><th scope="col">Day</th>{series.map(s => <th key={s.step} scope="col" className="num">{s.label}</th>)}</tr></thead>
            <tbody>
              {days.map((d, i) => <tr key={d}><th scope="row">{dayLabel(d)}</th>{series.map(s => <td key={s.step} className="num">{count(s.values[i])}</td>)}</tr>).reverse()}
            </tbody>
          </table>
        </ScrollBox>
      </details>
    </Panel>
  )
}
