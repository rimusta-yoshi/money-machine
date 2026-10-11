import { count, pct } from '../format'
import type { LayoutRow } from '../types'
import { Panel } from './Panel'

const SHOW = 3

/** Per section: the layouts kept most and least (never-kept ones count as least). */
export function LayoutPicksPanel({ layouts }: { layouts: LayoutRow[] }) {
  return (
    <Panel title="Layout picks" wide note="How often each layout was kept when someone chose one for a section. Layouts nobody kept count as the least picked.">
      <div className="ad-picks">
        {layouts.map(s => {
          const top = s.layouts.slice(0, SHOW)
          const bottom = s.layouts.length > SHOW ? s.layouts.slice(-Math.min(SHOW, s.layouts.length - SHOW)).reverse() : []
          return (
            <div key={s.section} className="ad-pick">
              <h3 className="ad-h3">{s.label} <span className="ad-detail">{count(s.total)} picks</span></h3>
              {s.total === 0 ? <p className="ad-empty">No picks yet.</p> : (
                <>
                  <p className="ad-pick-head">Most kept</p>
                  <ol className="ad-pick-list">{top.map(l => <li key={l.id}><span>{l.label}</span><span className="num">{count(l.n)} · {pct(l.share)}</span></li>)}</ol>
                  {bottom.length > 0 && (
                    <>
                      <p className="ad-pick-head">Least kept</p>
                      <ol className="ad-pick-list">{bottom.map(l => <li key={l.id}><span>{l.label}</span><span className="num">{count(l.n)} · {pct(l.share)}</span></li>)}</ol>
                    </>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
