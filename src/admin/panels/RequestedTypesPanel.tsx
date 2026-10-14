import { count, nice, shortDate } from '../format'
import type { RequestedType } from '../types'
import { Panel, ScrollBox } from './Panel'

/** "My business isn't listed": what people asked for, most asked first (all time), to choose the next packs. */
export function RequestedTypesPanel({ requested }: { requested: RequestedType[] }) {
  return (
    <Panel title="Requested business types" wide note="What people typed under “My business isn’t listed”, all time (whatever the dates above), with the type we suggested instead.">
      {requested.length === 0 ? <p className="ad-empty">Nobody has asked for a new type yet.</p> : (
        <ScrollBox label="Requested business types table">
          <table className="ad-table">
            <thead>
              <tr><th scope="col">They said</th><th scope="col">Times</th><th scope="col">We suggested</th><th scope="col">First asked</th><th scope="col">Last asked</th></tr>
            </thead>
            <tbody>
              {requested.map(r => (
                <tr key={r.text}>
                  <td>{r.text}</td>
                  <td className="num">{count(r.count)}</td>
                  <td>{nice(r.closest, 'Nothing close')}</td>
                  <td>{shortDate(r.firstAt)}</td>
                  <td>{shortDate(r.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollBox>
      )}
    </Panel>
  )
}
