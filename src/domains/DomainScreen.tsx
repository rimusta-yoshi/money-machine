import { useEffect, useState } from 'react'
import type { Api, DomainAnswer } from '../api/client'
import { storedDraftKey } from '../api/draftKey'
import { AccountShell } from '../builder/account/AccountShell'
import type { DomainReturn } from '../builder/account/screens'
import { DomainForm } from './DomainForm'
import { DomainWaiting } from './DomainWaiting'
import { useOwnDomain } from './useOwnDomain'
import './domain.css'

interface Props {
  api: Api
  /** The edit link's token from #domain=…; '' to use the key this browser holds. */
  token: string
  /** Back from the domain company's one-click page. */
  back: DomainReturn
}

const bare = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')
const newLink = <a className="sb-line-btn ba-btn" href="#lost-link">Email me a new link</a>

/** "Use your own domain": one page for the whole journey, opened from the edit link or the go-live step. */
export function DomainScreen({ api, token, back }: Props) {
  const [key] = useState(() => token || storedDraftKey())
  // The key stays in memory only, and a return from the domain company lands on a clean address.
  useEffect(() => {
    if (!token && !back) return
    try {
      window.history.replaceState(null, '', `${window.location.pathname}#domain`)
    } catch {
      // Left as is.
    }
  }, [token, back])

  if (!key) {
    return (
      <AccountShell title="Use your own domain">
        <p>Open the edit link from your welcome email first, then choose <b>Use your own domain</b>. Lost it? We’ll email a new one to the address you paid with.</p>
        {newLink}
      </AccountShell>
    )
  }
  return <DomainPage api={api} keyFor={key} back={back} />
}

function DomainPage({ api, keyFor, back }: { api: Api; keyFor: string; back: DomainReturn }) {
  const own = useOwnDomain(api, keyFor)
  const { state } = own
  return (
    <AccountShell title="Use your own domain">
      {state.phase === 'loading' && <p className="ba-wait" role="status"><span className="ba-spin" aria-hidden="true" />Loading…</p>}
      {state.phase === 'error' && (
        <>
          <p className="ba-error" role="alert">{state.status === 401 ? 'This link has been replaced by a newer one. Use the newest link we’ve emailed you.' : state.message}</p>
          {state.status === 401 ? newLink : <button type="button" className="sb-line-btn ba-btn" onClick={() => void own.recheck()}>Try again</button>}
        </>
      )}
      {state.phase === 'ready' && <DomainBody answer={state.answer} back={back} own={own} />}
      <p className="ba-small"><a href="/build/">Back to your site</a></p>
    </AccountShell>
  )
}

function DomainBody({ answer, back, own }: { answer: DomainAnswer; back: DomainReturn; own: ReturnType<typeof useOwnDomain> }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const d = answer.domain
  const disconnect = async () => {
    setError(await own.disconnect())
    setConfirming(false)
  }

  if (!d) {
    if (!answer.available) return <p>You can connect your own domain once your site is live and paid for.</p>
    return <DomainForm freeUrl={answer.freeUrl} busy={own.busy} onConnect={own.connect} />
  }
  return (
    <>
      {back === 'done' && d.status === 'pending' && <p className="od-note" role="status">Thanks. Your domain company is making the change: it usually takes a few minutes, and this page checks again by itself.</p>}
      {back === 'cancelled' && d.status === 'pending' && <p className="od-note" role="status">That wasn’t finished at your domain company, so nothing changed. Try again, or set it up by hand.</p>}
      {d.status === 'pending' && <DomainWaiting domain={d} checking={own.checking} onRecheck={() => void own.recheck()} />}
      {d.status === 'active' && (
        <>
          <p className="od-pill od-pill--live" role="status"><span aria-hidden="true" className="od-dot" />Live</p>
          <p>Your site is live at <a className="ba-big-link" href={d.liveUrl!} target="_blank" rel="noreferrer">{bare(d.liveUrl!)}</a></p>
          {answer.freeUrl && <p className="ba-small">{bare(answer.freeUrl)} sends visitors there too, so old links keep working.</p>}
          {d.host === 'www' && !d.apex && <p className="ba-small">So {d.domain} (without the www) works too, switch on free forwarding to {d.hostname} at {d.providerName ?? 'your domain company'}.</p>}
        </>
      )}
      {d.status === 'paused' && <p className="od-note">Your domain is paused while a payment dispute with your bank is open. It comes back if the dispute is settled in your favour.</p>}
      <div className="od-disconnect">
        {!confirming && <button type="button" className="sb-text-btn" onClick={() => setConfirming(true)}>Disconnect {d.hostname}</button>}
        {confirming && (
          <div role="group" aria-label="Disconnect your domain?">
            <p>Disconnect {d.hostname}? Your site goes back to {answer.freeUrl ? bare(answer.freeUrl) : 'its free address'}. You can connect a domain again any time.</p>
            <div className="od-buttons">
              <button type="button" className="sb-line-btn" onClick={() => void disconnect()} disabled={own.busy}>{own.busy ? 'Disconnecting…' : 'Yes, disconnect'}</button>
              <button type="button" className="sb-text-btn" onClick={() => setConfirming(false)}>Keep it</button>
            </div>
          </div>
        )}
        {error && <p className="ba-error" role="alert">{error}</p>}
      </div>
    </>
  )
}
