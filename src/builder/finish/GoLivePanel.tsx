import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import { ApiError } from '../../api/client'
import type { Shop } from '../../api/client'
import type { Draft } from '../../api/useDraft'
import { BRAND } from '../../brand/config'
import { BUILT_PRICE_PENCE, money } from '../../brand/price'
import { checkSlug, slugCandidates } from '../../publish/slug'
import { isReadyToPublish } from '../../site/checklist'
import { LIMITS } from '../../site/limits'
import type { Site } from '../../site/schema'
import type { BusinessInfo, TradeConfig } from '../../types'
import { TextField } from '../ui/TextField'
import { keepTesterCode, storedTesterCode } from './testerCode'

interface Props {
  site: Site
  trade: TradeConfig
  /** The saved draft, when this build has a server. */
  draft: Draft | null
  /** Shows the admin key field (dev builds): publishing without paying, for testing and support. */
  adminPublish: boolean
  /** e.g. siteblocks.co.uk */
  domain: string
  onBusinessChange: (patch: Partial<BusinessInfo>) => void
  /** Measures every section on real screens first: the checked record, or null if that failed. */
  verify: () => Promise<Site | null>
  /** Back from Stripe without paying. */
  cancelled?: boolean
  /** The server's price and whether orders are open (null until it answers). */
  shop?: Shop | null
  /** Sends the browser to Stripe's checkout page (swapped in tests). */
  redirect?: (url: string) => void
}

const ADMIN_STORAGE = 'siteblocks.admin'
const readAdmin = () => { try { return sessionStorage.getItem(ADMIN_STORAGE) ?? '' } catch { return '' } }
const keepAdmin = (v: string) => { try { sessionStorage.setItem(ADMIN_STORAGE, v) } catch { /* not kept */ } }
const emailSchema = z.string().trim().email()
const toStripe = (url: string) => window.location.assign(url)
const CANCELLED = 'Payment cancelled: nothing was taken. Everything is kept, so go live whenever you’re ready.'
const NOT_YET = 'We’re not taking orders yet. Your site is kept in this browser, so you can go live as soon as we are.'

type Check = { state: 'idle' | 'checking' } | { state: 'ok'; url?: string } | { state: 'bad'; message: string; suggestion?: string | null }

/**
 * The go-live panel: web address (checked as it's typed, and again by the server), email
 * for the receipt and edit link, the price, and the one button. Paying (Stripe Checkout) is
 * what puts a site live; a paid site re-publishes free at its own address.
 */
export function GoLivePanel({ site, trade, draft, adminPublish, domain, onBusinessChange, verify, cancelled, shop = null, redirect = toStripe }: Props) {
  const slugId = useId()
  const emailRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const slugRef = useRef<HTMLInputElement>(null)
  const [slug, setSlug] = useState(() => draft?.published?.slug ?? slugCandidates(site.business.name, { location: site.business.location, trade: trade.name })[0] ?? '')
  const [admin, setAdmin] = useState(readAdmin)
  const [remote, setRemote] = useState<{ slug: string; check: Check } | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(cancelled ? CANCELLED : null)
  const [live, setLive] = useState<string | null>(null)
  const [testerCode, setTesterCode] = useState(storedTesterCode)
  const [closedByServer, setClosedByServer] = useState(false)
  // Before launch only testers can pay; the server says which, and checks again.
  const ordersClosed = closedByServer || (shop ? !shop.launched : false)
  const price = money(shop?.pricePence ?? BUILT_PRICE_PENCE)

  // A paid site keeps the address it paid for (known once the server answers).
  const paidSlug = draft?.account.paid && draft.published ? draft.published.slug : null
  const paid = !!paidSlug
  const shown = paidSlug ?? slug
  const email = site.business.email
  const emailError = emailTouched && email.trim() !== '' && !emailSchema.safeParse(email).success ? "That email doesn't look right. Check for a missing @ or dot." : null
  const local = checkSlug(shown)
  const server = !!draft?.enabled
  const check: Check = paid ? { state: 'ok' } : !local.ok ? { state: 'bad', message: local.message } : !server ? { state: 'idle' } : remote?.slug === slug ? remote.check : { state: 'checking' }

  const slugStatus = draft?.slugStatus
  useEffect(() => {
    if (paid || !server || !slugStatus || !checkSlug(slug).ok) return
    let stale = false
    const t = setTimeout(async () => {
      let answer: Check = { state: 'idle' }
      try {
        const s = await slugStatus(slug)
        if (s) answer = s.available ? { state: 'ok', url: s.url } : { state: 'bad', message: s.message ?? 'That address is taken.', suggestion: s.suggestion }
      } catch {
        // Unknown for now: the server checks again at checkout.
      }
      if (!stale) setRemote({ slug, check: answer })
    }, 400)
    return () => { stale = true; clearTimeout(t) }
  }, [slug, paid, server, slugStatus])

  /** Puts the checked record live: free for a paid site, with the admin key when testing, else through Stripe. */
  const goLive = async (d: Draft, checked: Site) => {
    if (paid) return setLive((await d.publish(undefined, undefined, checked)).url)
    if (adminPublish && admin) {
      keepAdmin(admin)
      return setLive((await d.publish(slug, admin, checked)).url)
    }
    const code = testerCode.trim()
    if (code) keepTesterCode(code)
    redirect(await d.checkout(slug, checked, code || undefined))
  }

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
    if (!draft?.enabled) { setMessage('Going live isn’t switched on in this version of the builder.'); return }
    if (!paid && !(adminPublish && admin) && ordersClosed && !testerCode.trim()) { setMessage(NOT_YET); return }
    setBusy(true)
    try {
      const checked = await verify()
      if (!checked) throw new Error('Checking the site failed')
      // The checked record goes up as it is, not as it was at the last render.
      await goLive(draft, checked)
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'We couldn’t go live just now. Please try again.')
      if (err instanceof ApiError && err.code === 'not_launched') setClosedByServer(true)
      if (err instanceof ApiError && err.code === 'slug_taken') setRemote({ slug, check: { state: 'bad', message: err.message, suggestion: err.extra.suggestion as string | null } })
      setBusy(false)
    }
  }

  if (draft?.account.refunded) {
    return (
      <aside aria-labelledby="live-h" className="bg-panel">
        <h2 id="live-h" className="bg-h2">Refunded</h2>
        <p>This site was refunded and taken down. To go live again, start a new site.</p>
      </aside>
    )
  }

  if (live) {
    return (
      <aside aria-labelledby="live-h" className="bg-panel">
        <h2 id="live-h" className="bg-h2">It’s live.</h2>
        <p role="status">Your site is at <a href={live} target="_blank" rel="noreferrer">{live.replace(/^https:\/\//, '').replace(/\/$/, '')}</a></p>
        <p className="bg-small">Changes you make later go live, free, when you publish again.</p>
      </aside>
    )
  }

  return (
    <aside aria-labelledby="live-h" className="bg-panel">
      <h2 id="live-h" className="bg-h2">{paid ? 'Publish your changes' : 'Go live'}</h2>
      <form className="bg-form" onSubmit={submit} noValidate>
        <div className="bf-field">
          <label htmlFor={slugId} className="bf-label">Your web address</label>
          <span className="bg-slug">
            <input
              ref={slugRef} id={slugId} type="text" value={shown} maxLength={40} autoComplete="off" spellCheck={false} inputMode="url" readOnly={paid}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              aria-invalid={check.state === 'bad'} aria-describedby={`${slugId}-msg`}
            />
            <span aria-hidden="true">.{domain}</span>
          </span>
          <p id={`${slugId}-msg`} className={`bg-slug-msg bg-slug-msg--${check.state}`} aria-live="polite">
            {paid && 'This address is yours. Need a different one? Get in touch.'}
            {check.state === 'checking' && 'Checking…'}
            {!paid && check.state === 'ok' && <><span className="bg-ok-block" aria-hidden="true" />{slug}.{domain} is free. Got your own domain? Connect it after.</>}
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
        {ordersClosed && !paid && (
          <TextField
            label="Tester code" type="text" autoComplete="off" spellCheck={false} value={testerCode} onValue={setTesterCode}
            hint="We’re not taking orders yet. Testing for us? Enter your code."
          />
        )}
        {adminPublish && server && !paid && (
          <TextField
            label="Admin key" type="password" autoComplete="off" value={admin} onValue={setAdmin}
            hint="Testing only: publishes without paying. Leave it empty to pay."
          />
        )}
        {paid
          ? <p className="bg-small">Paid. Publishing changes is free, as often as you like.</p>
          : (
            <>
              <div className="bg-price">
                <span>One payment</span>
                <span className="bg-price-big">{price}</span>
              </div>
              <p className="bg-small">No monthly fees, ever. {BRAND.guarantee.line}</p>
            </>
          )}
        <p className="bg-message" role="status" aria-live="polite">{message ?? ''}</p>
        <button type="submit" className="sb-main-btn bg-go" disabled={busy}>
          {busy ? (paid ? 'Publishing…' : 'Going live…') : paid ? 'Publish changes' : `Go live for ${price}`}
        </button>
        {!paid && <p className="bg-small bg-center">Secure card payment by Stripe. Your card details go to Stripe, never to us.</p>}
      </form>
    </aside>
  )
}
