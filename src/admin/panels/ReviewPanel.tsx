import { useEffect, useState } from 'react'
import { AdminError, clearReview, fetchReview } from '../adminApi'
import { shortDate } from '../format'
import type { ReviewSite } from '../types'
import { Panel, ScrollBox } from './Panel'

interface Props {
  base: string
  adminKey: string
  /** Changes when the dashboard is refreshed: the list is loaded again. */
  refresh: unknown
  onRefused: (message: string) => void
}

type Load = { state: 'loading' } | { state: 'ok'; sites: ReviewSite[] } | { state: 'error'; message: string }

const STATUS = (s: ReviewSite): string => (s.refunded ? 'Refunded' : s.paid ? 'Paid' : s.published ? 'Published (admin)' : 'Not paid yet')
const label = (s: ReviewSite): string => s.name || `Site ${s.ref.slice(0, 8).toUpperCase()}`

/**
 * Sites whose text has words like "bank" or "password" (server/core/reviewWords.ts), found at
 * checkout or publish. All time, newest first. "Mark reviewed" takes one off until its text changes.
 */
export function ReviewPanel({ base, adminKey, refresh, onRefused }: Props) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [busy, setBusy] = useState<string | null>(null)
  const [said, setSaid] = useState('')

  useEffect(() => {
    let live = true
    fetchReview(base, adminKey).then(
      sites => { if (live) setLoad({ state: 'ok', sites }) },
      err => {
        if (!live) return
        if (err instanceof AdminError && (err.status === 401 || err.status === 403)) onRefused(err.message)
        else setLoad({ state: 'error', message: err instanceof Error ? err.message : 'The sites to review could not be loaded.' })
      },
    )
    return () => { live = false }
  }, [base, adminKey, refresh, onRefused])

  const markReviewed = async (site: ReviewSite) => {
    setBusy(site.ref)
    setSaid('')
    try {
      await clearReview(base, adminKey, site.ref)
      setLoad(l => (l.state === 'ok' ? { state: 'ok', sites: l.sites.filter(s => s.ref !== site.ref) } : l))
      setSaid(`${label(site)} marked reviewed.`)
    } catch (err) {
      setSaid(err instanceof Error ? err.message : 'That site could not be marked reviewed. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel title="Sites to review" wide note="Sites whose words (like bank, log in or password) are worth a look, found at checkout or publishing. All time. The customer is never told.">
      <p role="status" className="ad-note ad-status-line">{load.state === 'loading' ? 'Loading the sites to review…' : said}</p>
      {load.state === 'error' && <p className="bf-error" role="alert">{load.message}</p>}
      {load.state === 'ok' && (load.sites.length === 0 ? <p className="ad-empty">Nothing to review.</p> : (
        <ScrollBox label="Sites to review table">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Business</th><th scope="col">Words found</th><th scope="col">Status</th><th scope="col">Flagged</th>
                <th scope="col">Site</th><th scope="col"><span className="sb-sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {load.sites.map(s => (
                <tr key={s.ref}>
                  <th scope="row">{label(s)}<span className="ad-detail"> · {s.ref.slice(0, 8).toUpperCase()}</span></th>
                  <td>{s.words.join(', ')}</td>
                  <td><span className={`ad-status ad-status--${s.refunded ? 'refunded' : s.paid ? 'paid' : s.published ? 'published' : 'draft'}`}>{STATUS(s)}</span></td>
                  <td>{shortDate(s.flaggedAt)}</td>
                  <td>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{new URL(s.url).host}<span className="sb-sr-only"> (opens in a new tab)</span></a> : '–'}</td>
                  <td>
                    <button type="button" className="sb-text-btn" disabled={busy === s.ref} onClick={() => { void markReviewed(s) }}>
                      Mark reviewed<span className="sb-sr-only">: {label(s)}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollBox>
      ))}
    </Panel>
  )
}
