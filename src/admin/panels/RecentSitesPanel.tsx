import { nice, shortDate } from '../format'
import type { RecentSite, SiteStatus } from '../types'
import { Panel, ScrollBox } from './Panel'

const STATUS: Record<SiteStatus, string> = { draft: 'Draft', published: 'Published (admin)', paid: 'Paid', disputed: 'Disputed', refunded: 'Refunded' }

/** The last 50 sites started in the range: status, trade, theme, source, dates and the live link. */
export function RecentSitesPanel({ sites }: { sites: RecentSite[] }) {
  return (
    <Panel title="Recent sites" wide note="The last 50 started in this range. A site is only on the server once it has a photo, a preview or a checkout.">
      {sites.length === 0 ? <p className="ad-empty">No sites in this range.</p> : (
        <ScrollBox label="Recent sites table">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Started</th><th scope="col">Status</th><th scope="col">Trade</th><th scope="col">Theme</th>
                <th scope="col">Source</th><th scope="col">Paid</th><th scope="col">Site</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(s => (
                <tr key={s.ref}>
                  <td>{shortDate(s.createdAt)}</td>
                  <td><span className={`ad-status ad-status--${s.status}`}>{STATUS[s.status]}</span></td>
                  <td>{nice(s.trade)}</td>
                  <td>{nice(s.theme)}</td>
                  <td>{s.src ?? 'Direct'}{s.campaign && <span className="ad-detail"> · {s.campaign}</span>}</td>
                  <td>{s.paidAt ? shortDate(s.paidAt) : '–'}</td>
                  <td>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{new URL(s.url).host}<span className="sb-sr-only"> (opens in a new tab)</span></a> : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollBox>
      )}
    </Panel>
  )
}
