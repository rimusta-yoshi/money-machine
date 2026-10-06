import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import { ApiError } from '../../api/client'
import type { Draft } from '../../api/useDraft'
import { BRAND } from '../../brand/config'
import { checkSlug, slugCandidates } from '../../publish/slug'
import { isReadyToPublish } from '../../site/checklist'
import { LIMITS } from '../../site/limits'
import type { Site } from '../../site/schema'
import type { BusinessInfo, TradeConfig } from '../../types'
import { TextField } from '../ui/TextField'

interface Props {
  site: Site
  trade: TradeConfig
  /** The saved draft, when this build has a server. */
  draft: Draft | null
  /** Publishing with the admin key (Phase 1, until payments exist). */
  adminPublish: boolean
  /** e.g. siteblocks.co.uk */
  domain: string
  onBusinessChange: (patch: Partial<BusinessInfo>) => void
  /** Measures every section on real screens first: the checked record, or null if that failed. */
  verify: () => Promise<Site | null>
}

const ADMIN_STORAGE = 'siteblocks.admin'
const readAdmin = () => { try { return sessionStorage.getItem(ADMIN_STORAGE) ?? '' } catch { return '' } }
const keepAdmin = (v: string) => { try { sessionStorage.setItem(ADMIN_STORAGE, v) } catch { /* not kept */ } }
const emailSchema = z.string().trim().email()
/** Card payments come in Phase 2; until then the panel doesn't promise them. */
const PAYMENTS_OPEN = false

type Check = { state: 'idle' | 'checking' } | { state: 'ok'; url?: string } | { state: 'bad'; message: string; suggestion?: string | null }

/**
 * The go-live panel: web address (checked as it's typed, and again by the server), email
 * for the receipt and edit link, the price, and the one button. Publishing still uses the
 * admin key until payments open; without it the button says so plainly.
 */
export function GoLivePanel({ site, trade, draft, adminPublish, domain, onBusinessChange, verify }: Props) {
  const slugId = useId()
  const emailRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const slugRef = useRef<HTMLInputElement>(null)
  const [slug, setSlug] = useState(() => draft?.published?.slug ?? slugCandidates(site.business.name, { location: site.business.location, trade: trade.name })[0] ?? '')
  const [admin, setAdmin] = useState(readAdmin)
  const [remote, setRemote] = useState<{ slug: string; check: Check } | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [live, setLive] = useState<string | null>(null)

  const email = site.business.email
  const emailError = emailTouched && email.trim() !== '' && !emailSchema.safeParse(email).success ? "That email doesn't look right. Check for a missing @ or dot." : null
  const local = checkSlug(slug)
  const server = !!draft?.enabled
  const check: Check = !local.ok ? { state: 'bad', message: local.message } : !server ? { state: 'idle' } : remote?.slug === slug ? remote.check : { state: 'checking' }

  const key = draft?.key
  const saveNow = draft?.saveNow
  const slugStatus = draft?.slugStatus
  useEffect(() => {
    if (!server || !saveNow || !slugStatus || !checkSlug(slug).ok) return
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
  }, [slug, key, server, saveNow, slugStatus])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!isReadyToPublish(site)) {
      setEmailTouched(true)
      setMessage('Add your email so we can send your receipt and edit link.')
      emailRef.current?.focus()
      return
    }
    if (check.state === 'bad') { slugRef.current?.focus(); return }
    if (!draft?.enabled || !adminPublish) {
      setMessage(draft?.enabled ? 'Payments open soon. Your site is saved, so you can go live as soon as they do.' : 'Going live isn’t switched on in this version of the builder.')
      return
    }
    if (!admin) { setMessage('Publishing is invite-only until payments open: add the admin key.'); return }
    setBusy(true)
    keepAdmin(admin)
    try {
      const checked = await verify()
      if (!checked) throw new Error('Checking the site failed')
      // The checked record goes up as it is, not as it was at the last render.
      setLive((await draft.publish(slug, admin, checked)).url)
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'We couldn’t publish just now. Please try again.')
      if (err instanceof ApiError && err.code === 'slug_taken') setRemote({ slug, check: { state: 'bad', message: err.message, suggestion: err.extra.suggestion as string | null } })
    } finally {
      setBusy(false)
    }
  }

  if (live) {
    return (
      <aside aria-labelledby="live-h" className="bg-panel">
        <h2 id="live-h" className="bg-h2">It’s live.</h2>
        <p role="status">Your site is at <a href={live} target="_blank" rel="noreferrer">{live.replace(/^https:\/\//, '').replace(/\/$/, '')}</a></p>
        <p className="bg-small">Changes you make later go live when you publish again.</p>
      </aside>
    )
  }

  return (
    <aside aria-labelledby="live-h" className="bg-panel">
      <h2 id="live-h" className="bg-h2">Go live</h2>
      <form className="bg-form" onSubmit={submit} noValidate>
        <div className="bf-field">
          <label htmlFor={slugId} className="bf-label">Your web address</label>
          <span className="bg-slug">
            <input
              ref={slugRef} id={slugId} type="text" value={slug} maxLength={40} autoComplete="off" spellCheck={false} inputMode="url"
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              aria-invalid={check.state === 'bad'} aria-describedby={`${slugId}-msg`}
            />
            <span aria-hidden="true">.{domain}</span>
          </span>
          <p id={`${slugId}-msg`} className={`bg-slug-msg bg-slug-msg--${check.state}`} aria-live="polite">
            {check.state === 'checking' && 'Checking…'}
            {check.state === 'ok' && <><span className="bg-ok-block" aria-hidden="true" />{slug}.{domain} is free. Got your own domain? Connect it after.</>}
            {check.state === 'idle' && 'We check it’s free when you go live. Got your own domain? Connect it after.'}
            {check.state === 'bad' && check.message}
          </p>
          {check.state === 'bad' && check.suggestion && (
            <button type="button" className="sb-line-btn bg-suggest" onClick={() => setSlug(check.suggestion!)}>Use {check.suggestion}.{domain}</button>
          )}
        </div>
        <TextField
          label="Your email" type="email" autoComplete="email" maxLength={LIMITS.email} placeholder="you@example.com" inputRef={emailRef}
          value={email} onValue={v => onBusinessChange({ email: v })} onBlur={() => setEmailTouched(true)}
          hint="We'll send your receipt and a link to edit your site. Nothing else." error={emailError}
        />
        {adminPublish && server && (
          <TextField
            label="Admin key" type="password" autoComplete="off" value={admin} onValue={setAdmin}
            hint="Publishing is invite-only until payments open."
          />
        )}
        <div className="bg-price">
          <span>One payment</span>
          <span className="bg-price-big">{BRAND.price}</span>
        </div>
        <p className="bg-small">No monthly fees, ever. {BRAND.refundPolicy}</p>
        <p className="bg-message" role="status" aria-live="polite">{message ?? ''}</p>
        <button type="submit" className="sb-main-btn bg-go" disabled={busy}>
          {busy ? 'Going live…' : draft?.published ? 'Publish changes' : `Go live for ${BRAND.price}`}
        </button>
        {PAYMENTS_OPEN && <p className="bg-small bg-center">Card payment by Stripe. You'll come straight back to your live site.</p>}
      </form>
    </aside>
  )
}
