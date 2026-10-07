import { useEffect, useState } from 'react'
import { ApiError } from '../../api/client'
import type { Api, RefundState } from '../../api/client'
import { BRAND } from '../../brand/config'
import { money } from '../../brand/price'
import { AccountShell } from './AccountShell'

interface Props {
  api: Api
  /** The refund link's token (#refund=…). */
  token: string
}

type View = { state: 'loading' } | { state: 'invalid'; message: string } | RefundState

const bare = (url: string) => url.replace(/^https:\/\//, '').replace(/\/$/, '')

/**
 * The refund link from the welcome email: one question and one button. After the guarantee
 * ends it says so; a used link says it's already done.
 */
export function RefundScreen({ api, token }: Props) {
  const [view, setView] = useState<View>({ state: 'loading' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.refundStatus(token).then(setView, err => {
      setView({ state: 'invalid', message: err instanceof ApiError ? err.message : 'We couldn’t check that link. Check your connection and reload the page.' })
    })
  }, [api, token])

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      setView(await api.refund(token))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The refund didn’t go through. Please try again.')
    }
    setBusy(false)
  }

  switch (view.state) {
    case 'loading':
      return <AccountShell title="Request a refund"><p role="status">Checking your link…</p></AccountShell>
    case 'invalid':
      return <AccountShell title="That link isn’t right"><p>{view.message}</p></AccountShell>
    case 'used':
      return <AccountShell title="Already refunded"><p>This site has been refunded and taken down. The money goes back to the card you paid with.</p></AccountShell>
    case 'expired':
      return (
        <AccountShell title={`The ${BRAND.guarantee.days}-day guarantee has ended`}>
          <p>Refunds through this link work for {BRAND.guarantee.days} days after paying. Get in touch at <a href={`mailto:${view.support}`}>{view.support}</a> and we’ll see what we can do.</p>
        </AccountShell>
      )
    case 'disputed':
      return (
        <AccountShell title="Your payment is being disputed">
          <p>Your bank is looking into this payment, so it can’t be refunded here as well. Get in touch at <a href={`mailto:${view.support}`}>{view.support}</a> if you need help.</p>
        </AccountShell>
      )
    case 'refunded':
      return (
        <AccountShell title="Your refund is on its way">
          <p role="status">We’ve refunded {money(view.amount)} to the card you paid with. It usually shows within 5 to 10 working days.</p>
          <p>Your site has been taken down, and we’ve emailed you a confirmation.</p>
        </AccountShell>
      )
    case 'ok':
      return (
        <AccountShell title={`Refund ${money(view.amount)} and take your site down?`}>
          <p>{bare(view.siteUrl)} comes down straight away and {money(view.amount)} goes back to your card. This can’t be undone.</p>
          {error && <p className="ba-error" role="alert">{error}</p>}
          <button type="button" className="sb-main-btn ba-btn" onClick={confirm} disabled={busy}>
            {busy ? 'Refunding…' : `Refund ${money(view.amount)} and take my site down`}
          </button>
          <p className="ba-small">Changed your mind? Just close this page.</p>
        </AccountShell>
      )
  }
}
