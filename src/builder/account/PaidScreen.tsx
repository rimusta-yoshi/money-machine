import { useEffect, useState } from 'react'
import { ApiError } from '../../api/client'
import type { Api, CheckoutState } from '../../api/client'
import { AccountShell } from './AccountShell'

interface Props {
  api: Api
  /** Stripe's checkout session id, from the success URL (?paid=…). */
  sessionId: string
  /** Poll interval in ms (shorter in tests). */
  every?: number
}

/** After a minute or so the page says so, and keeps checking more slowly. */
const SLOW_AFTER = 30

type View = CheckoutState | { state: 'unknown' }

/**
 * Stripe's success page: "Payment received, publishing your site…", checking until the
 * webhook has put the site live, then the link to it.
 */
export function PaidScreen({ api, sessionId, every = 2000 }: Props) {
  const [view, setView] = useState<View>({ state: 'waiting' })
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (view.state !== 'waiting') return
    const t = setTimeout(() => {
      api.checkoutStatus(sessionId).then(setView, err => {
        if (err instanceof ApiError && err.status === 404) setView({ state: 'unknown' })
      }).finally(() => setTries(n => n + 1))
    }, tries === 0 ? 0 : tries > SLOW_AFTER ? every * 5 : every)
    return () => clearTimeout(t)
  }, [api, sessionId, every, tries, view.state])

  if (view.state === 'live') {
    const bare = view.url.replace(/^https:\/\//, '').replace(/\/$/, '')
    return (
      <AccountShell title="Your site is live">
        <p role="status"><a className="ba-big-link" href={view.url}>{bare}</a></p>
        <p>We’ve emailed your receipt and your edit link. Keep that email: the link lets you change your site, free, from any device.</p>
        <a className="sb-main-btn ba-btn" href={view.url}>Visit your site</a>
      </AccountShell>
    )
  }
  if (view.state === 'refunded') {
    return (
      <AccountShell title="This payment was refunded">
        <p>The site it paid for has been taken down.</p>
      </AccountShell>
    )
  }
  if (view.state === 'unknown') {
    return (
      <AccountShell title="We can’t find that payment">
        <p>If you’ve paid, don’t worry: your receipt and edit link are on their way by email.</p>
      </AccountShell>
    )
  }
  return (
    <AccountShell title="Payment received">
      <p className="ba-wait" role="status"><span className="ba-spin" aria-hidden="true" />Publishing your site…</p>
      <p className="ba-small">
        {tries > SLOW_AFTER
          ? 'This is taking longer than usual. Your payment is safe: we’ll email you the moment your site is live, so you can close this page.'
          : 'This usually takes a few seconds. Please keep this page open.'}
      </p>
    </AccountShell>
  )
}
