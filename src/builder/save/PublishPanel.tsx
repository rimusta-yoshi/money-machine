import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../api/client'
import type { Draft } from '../../api/useDraft'
import { checkSlug, slugCandidates } from '../../publish/slug'
import type { Site } from '../../site/schema'
import type { TradeConfig } from '../../types'
import { Icon } from '../../components/ui/Icon'
import './save.css'

interface Props {
  draft: Draft
  site: Site
  trade: TradeConfig
  /** e.g. siteblocks.co.uk */
  domain: string
}

const ADMIN_STORAGE = 'siteblocks.admin'
const readAdmin = () => { try { return sessionStorage.getItem(ADMIN_STORAGE) ?? '' } catch { return '' } }
const keepAdmin = (v: string) => { try { sessionStorage.setItem(ADMIN_STORAGE, v) } catch { /* not kept */ } }

type Check = { state: 'idle' | 'checking' } | { state: 'ok'; url?: string } | { state: 'bad'; message: string; suggestion?: string | null }

/**
 * Publishing, Phase 1: choose the address and publish with the admin key (payment comes in
 * Phase 2). The address is checked as it's typed; the server checks it again.
 */
export function PublishPanel({ draft, site, trade, domain }: Props) {
  const slugId = useId()
  const adminId = useId()
  const [slug, setSlug] = useState(() => draft.published?.slug ?? slugCandidates(site.business.name, { location: site.business.location, trade: trade.name })[0] ?? '')
  const [admin, setAdmin] = useState(readAdmin)
  /** The server's answer for an address (the local rules are checked while rendering). */
  const [remote, setRemote] = useState<{ slug: string; check: Check } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState<string | null>(null)

  const local = checkSlug(slug)
  const check: Check = !local.ok ? { state: 'bad', message: local.message } : remote?.slug === slug ? remote.check : { state: 'checking' }

  const { key, saveNow, slugStatus } = draft
  useEffect(() => {
    if (!checkSlug(slug).ok) return
    let stale = false
    const t = setTimeout(async () => {
      let answer: Check = { state: 'idle' }
      try {
        if (!key) await saveNow()
        const s = await slugStatus(slug)
        if (s) answer = s.available ? { state: 'ok', url: s.url } : { state: 'bad', message: s.message ?? 'That address is taken.', suggestion: s.suggestion }
      } catch {
        // Unknown for now: the server checks again when publishing.
      }
      if (!stale) setRemote({ slug, check: answer })
    }, 400)
    return () => { stale = true; clearTimeout(t) }
  }, [slug, key, saveNow, slugStatus])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (check.state === 'bad' || !admin) return
    setBusy(true)
    setError(null)
    keepAdmin(admin)
    try {
      setLive((await draft.publish(slug, admin)).url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Publishing failed. Please try again.')
      if (err instanceof ApiError && err.code === 'slug_taken') setRemote({ slug, check: { state: 'bad', message: err.message, suggestion: err.extra.suggestion as string | null } })
    } finally {
      setBusy(false)
    }
  }

  if (live) {
    return (
      <div className="mm-publish-done" role="status">
        <p><b>It’s live.</b> Your site is at</p>
        <a className="mm-done-go" href={live} target="_blank" rel="noreferrer">{live.replace(/^https:\/\//, '').replace(/\/$/, '')} <Icon.Arrow size={18} /></a>
        <p className="mm-publish-note">Changes you make later go live when you publish again.</p>
      </div>
    )
  }

  return (
    <form className="mm-publish" onSubmit={submit} noValidate>
      <div className="mm-publish-fld">
        <label htmlFor={slugId}>Your web address</label>
        <div className="mm-publish-slug">
          <input
            id={slugId} type="text" value={slug} maxLength={40} autoComplete="off" spellCheck={false} inputMode="url"
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            aria-invalid={check.state === 'bad'} aria-describedby={`${slugId}-msg`}
          />
          <span aria-hidden="true">.{domain}</span>
        </div>
        <p id={`${slugId}-msg`} className={`mm-publish-msg${check.state === 'bad' ? ' bad' : ''}`} aria-live="polite">
          {check.state === 'checking' && 'Checking…'}
          {check.state === 'ok' && `${slug}.${domain} is free.`}
          {check.state === 'bad' && check.message}
        </p>
        {check.state === 'bad' && check.suggestion && (
          <button type="button" className="mm-publish-suggest" onClick={() => setSlug(check.suggestion!)}>Use {check.suggestion}.{domain}</button>
        )}
      </div>
      <div className="mm-publish-fld">
        <label htmlFor={adminId}>Admin key</label>
        <input id={adminId} type="password" value={admin} autoComplete="off" onChange={e => setAdmin(e.target.value)} aria-describedby={`${adminId}-hint`} />
        <p id={`${adminId}-hint`} className="mm-publish-msg">Publishing is invite-only until payments open.</p>
      </div>
      {error && <p className="mm-publish-msg bad" role="alert">{error}</p>}
      <button type="submit" className="mm-done-go" disabled={busy || check.state === 'bad' || !admin}>
        <Icon.Arrow size={18} /> {busy ? 'Publishing…' : draft.published ? 'Publish changes' : 'Publish my site'}
      </button>
    </form>
  )
}
