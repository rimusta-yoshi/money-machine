import { useState } from 'react'
import { STEP_LABELS } from '../../analytics/funnel'
import type { Step } from '../../analytics/funnel'
import { count, nice, pct } from '../format'
import type { BreakdownRow, Stats } from '../types'
import { Panel, ScrollBox } from './Panel'

type By = keyof Stats['breakdowns']

const VIEWS: { id: By; label: string; empty: string; base: Step }[] = [
  { id: 'src', label: 'Ad source', empty: 'Direct (no source)', base: 'landed' },
  { id: 'trade', label: 'Trade', empty: 'Not chosen yet', base: 'basics_done' },
  { id: 'theme', label: 'Theme', empty: 'Not chosen yet', base: 'look_picked' },
]

const COLUMNS: { step: Step; label: string }[] = [
  { step: 'landed', label: 'Landed' }, { step: 'started', label: 'Started' }, { step: 'basics_done', label: 'Basics' },
  { step: 'look_picked', label: 'Look' }, { step: 'build_done', label: 'Build done' }, { step: 'checkout_started', label: 'Checkout' },
  { step: 'paid', label: 'Paid' },
]

/** The funnel split by ad source, trade or theme. */
export function BreakdownPanel({ breakdowns }: { breakdowns: Stats['breakdowns'] }) {
  const [by, setBy] = useState<By>('src')
  const view = VIEWS.find(v => v.id === by)!
  const rows: BreakdownRow[] = breakdowns[by]
  return (
    <Panel title="Breakdowns" wide note={<>Conversion is paid ÷ {STEP_LABELS[view.base].toLowerCase()}, the first step that knows the {view.label.toLowerCase()}.</>}>
      <div role="group" aria-label="Split the funnel by" className="ad-seg ad-seg--small">
        {VIEWS.map(v => <button key={v.id} type="button" aria-pressed={by === v.id} onClick={() => setBy(v.id)}>{v.label}</button>)}
      </div>
      {rows.length === 0 ? <p className="ad-empty">Nothing recorded in this range.</p> : (
        <ScrollBox label="Breakdown table">
          <table className="ad-table">
            <caption className="sb-sr-only">The funnel by {view.label.toLowerCase()}</caption>
            <thead>
              <tr>
                <th scope="col">{view.label}</th>
                {COLUMNS.map(c => <th key={c.step} scope="col" className="num">{c.label}</th>)}
                <th scope="col" className="num">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key ?? '(none)'}>
                  <th scope="row">{by === 'src' ? r.key ?? view.empty : nice(r.key, view.empty)}</th>
                  {COLUMNS.map(c => <td key={c.step} className="num">{count(r.counts[c.step] ?? 0)}</td>)}
                  <td className="num"><b>{pct(r.conversion)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollBox>
      )}
    </Panel>
  )
}
