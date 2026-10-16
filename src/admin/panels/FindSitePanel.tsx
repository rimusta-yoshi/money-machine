import { useState } from 'react'
import type { FormEvent } from 'react'
import { BRAND } from '../../brand/config'
import { AdminError, findSite } from '../adminApi'
import { shortDate } from '../format'
import type { SiteSummary } from '../types'
import { Panel } from './Panel'
import { TakedownForm } from './TakedownForm'
import { siteLabel, standing } from '../takedown'
import type { TakedownAction } from '../takedown'

interface Props {
  base: string
  adminKey: string
  onRefused: (message: string) => void
}

const when = (t: number | null): string => (t ? shortDate(t) : '–')
/** The latest payment refunded because it landed while the site was taken down, if any. */
const refundedAt = (t: SiteSummary['takedown'] | undefined): number | null => t?.log.filter(x => x.action === 'refunded').at(-1)?.at ?? null

/**
 * "Find a site by address": the free address, the customer's own domain (bare or www) or the
 * site's reference. Shows where it stands and its take-down record, with Take down or Restore.
 */
export function FindSitePanel({ base, adminKey, onRefused }: Props) {
  const [address, setAddress] = useState('')
  const [site, setSite] = useState<SiteSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [said, setSaid] = useState('')
  const [action, setAction] = useState<TakedownAction | null>(null)

  const find = async (e: FormEvent) => {
    e.preventDefault()
    if (!address.trim()) { setError('Type a site’s address.'); return }
    setBusy(true)
    setError(null)
    setSaid('')
    setAction(null)
    try {
      setSite(await findSite(base, adminKey, address))
    } catch (err) {
      if (err instanceof AdminError && err.status === 401) { onRefused(err.message); return }
      setSite(null)
      setError(err instanceof Error ? err.message : 'That site could not be found.')
    } finally {
      setBusy(false)
    }
  }

  const t = site?.takedown
  return (
    <Panel title="Find a site" wide note={`By its address (name.${BRAND.domain}), the owner’s own domain, or its reference. Take a harmful site down here, or put one back.`}>
      <form className="ad-find" onSubmit={e => { void find(e) }} noValidate>
        <div className="bf-field ad-find-field">
          <label className="bf-label" htmlFor="ad-find-input">Site address</label>
          <input
            id="ad-find-input" className="bf-input" type="text" inputMode="url" autoComplete="off" spellCheck={false} value={address}
            aria-invalid={error ? true : undefined} aria-describedby={error ? 'ad-find-error' : undefined} onChange={e => setAddress(e.target.value)}
          />
        </div>
        <button type="submit" className="sb-line-btn" disabled={busy}>{busy ? 'Finding…' : 'Find'}</button>
      </form>
      {error && <p id="ad-find-error" className="bf-error" role="alert">{error}</p>}
      <p role="status" className="ad-note ad-status-line">{said}</p>
      {site && (
        <section className="ad-found" aria-label={`Found: ${siteLabel(site)}`}>
          <h3 className="ad-h3">{siteLabel(site)}<span className={`ad-status ad-status--${site.takenDown ? 'down' : site.paid && !site.refunded ? 'paid' : 'draft'}`}>{standing(site)}</span></h3>
          <dl className="ad-facts">
            <div><dt>Address</dt><dd>{site.url ? new URL(site.url).host : '–'}</dd></div>
            <div><dt>Own domain</dt><dd>{site.ownDomain ? `${site.ownDomain.hostname} (${site.ownDomain.status})` : '–'}</dd></div>
            <div><dt>Owner’s email</dt><dd>{site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : '–'}</dd></div>
            <div><dt>Reference</dt><dd>{site.ref}</dd></div>
            {t?.reason && (
              <div><dt>{site.takenDown ? 'Taken down' : 'Last taken down'}</dt><dd>{t.reason} <span className="ad-detail">· {t.by ?? '–'} · {when(t.log.filter(x => x.action === 'takedown').at(-1)?.at ?? t.takenDownAt)}</span></dd></div>
            )}
            {refundedAt(t) && <div><dt>Refunded automatically</dt><dd>Paid while taken down <span className="ad-detail">· {when(refundedAt(t))}</span></dd></div>}
            {t?.restoredAt && <div><dt>Last restored</dt><dd>{t.restoredBy ?? '–'} <span className="ad-detail">· {when(t.restoredAt)}</span></dd></div>}
          </dl>
          {/* One button, kept while the form is open, so focus comes back to it. */}
          <button
            id="ad-find-action" type="button" className={site.takenDown ? 'sb-line-btn' : 'ad-danger-btn'} aria-expanded={!!action}
            onClick={() => setAction(a => (a ? null : site.takenDown ? 'restore' : 'takedown'))}
          >
            {site.takenDown ? 'Restore' : 'Take down'}{' '}<span className="sb-sr-only">{siteLabel(site)}</span>
          </button>
          {action && (
            <TakedownForm
              base={base} adminKey={adminKey} target={{ ref: site.ref, label: siteLabel(site) }} action={action}
              onCancel={() => setAction(null)} openerId="ad-find-action"
              onDone={(next, message) => { setSite(next); setAction(null); setSaid(message) }}
            />
          )}
        </section>
      )}
    </Panel>
  )
}
