import { count, nice, shortDate } from '../format'
import type { DomainStats } from '../types'
import { Panel, ScrollBox } from './Panel'

const STATUS: Record<DomainStats['recent'][number]['status'], string> = { pending: 'Waiting', active: 'Live', paused: 'Paused (dispute)', removing: 'Being removed' }

/**
 * Customers' own domains, all time: how many are on Cloudflare against the free allowance, and the
 * newest. To disconnect one: POST /v1/admin/domains/disconnect with the admin key (server/README.md).
 */
export function DomainsPanel({ domains }: { domains: DomainStats }) {
  const { counts } = domains
  return (
    <Panel title="Own domains" wide note={`All time. Cloudflare charges nothing for the first ${count(domains.freeLimit)} custom hostnames, then $0.10 a month each; a connected bare domain counts as a second one.`}>
      <p className="ad-big-line">
        <b>{count(domains.onCloudflare)}</b> of {count(domains.freeLimit)} free on Cloudflare · {count(counts.active)} live · {count(counts.pending)} waiting
        {counts.paused > 0 && <> · {count(counts.paused)} paused</>}
      </p>
      {domains.recent.length === 0 ? <p className="ad-empty">Nobody has connected a domain yet.</p> : (
        <ScrollBox label="Own domains table">
          <table className="ad-table">
            <thead>
              <tr><th scope="col">Domain</th><th scope="col">Status</th><th scope="col">Company</th><th scope="col">One-click</th><th scope="col">Added</th><th scope="col">Free address</th></tr>
            </thead>
            <tbody>
              {domains.recent.map(d => (
                <tr key={d.hostname}>
                  <td>{d.hostname}{d.apex && <span className="ad-detail"> + {d.apex}</span>}</td>
                  <td>{STATUS[d.status]}</td>
                  <td>{nice(d.provider, 'Other')}</td>
                  <td>{d.oneClick ? 'Yes' : 'No'}</td>
                  <td>{shortDate(d.createdAt)}</td>
                  <td>{d.siteUrl ? new URL(d.siteUrl).host : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollBox>
      )}
    </Panel>
  )
}
