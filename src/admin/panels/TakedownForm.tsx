import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { adminName, restoreSite, takeDownSite } from '../adminApi'
import { doneMessage } from '../takedown'
import type { TakedownAction } from '../takedown'
import type { SiteSummary } from '../types'

/** The site the form acts on, as its panel names it. */
export interface TakedownTarget { ref: string; label: string }

interface Props {
  base: string
  adminKey: string
  target: TakedownTarget
  action: TakedownAction
  /** Done: the site as it is now, and what to announce. */
  onDone: (site: SiteSummary, said: string) => void
  onCancel: () => void
  /** The id of the button that opened it: focus goes back there when it closes. */
  openerId: string
}

const REASON_MAX = 500

/**
 * Take down (asks why, then confirms) or restore (confirms) one site. Shown below its panel's
 * list, not inside a table row, so it fits a phone. Focus moves into it when it opens and goes
 * back to the button that opened it when it closes.
 */
export function TakedownForm({ base, adminKey, target, action, onDone, onCancel, openerId }: Props) {
  const id = useId()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const whyBox = useRef<HTMLTextAreaElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const start = whyBox.current ?? heading.current
    start?.focus()
    // Back to the button that opened it, unless focus has already gone somewhere else on purpose.
    return () => {
      const lost = !document.activeElement || document.activeElement === document.body
      if (lost) document.getElementById(openerId)?.focus()
    }
  }, [openerId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const why = reason.trim()
    if (action === 'takedown' && why.length < 3) {
      setError('Say why it’s coming down (a few words at least).')
      whyBox.current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const by = await adminName()
      const r = action === 'takedown'
        ? await takeDownSite(base, adminKey, { ref: target.ref, reason: why, by })
        : await restoreSite(base, adminKey, { ref: target.ref, by })
      onDone(r.site, doneMessage(action, target.label, r))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t work. Try again.')
      setBusy(false)
    }
  }

  const takedown = action === 'takedown'
  return (
    <form className={`ad-td ad-td--${action}`} onSubmit={e => { void submit(e) }} aria-labelledby={`${id}-h`} noValidate>
      <h3 id={`${id}-h`} className="ad-h3" tabIndex={-1} ref={heading}>
        {takedown ? `Take down ${target.label}?` : `Restore ${target.label}?`}
      </h3>
      {takedown
        ? <p className="ad-note">It goes offline within a minute or two on its free address and own domain, and the owner can’t edit, publish, download or refund it. Nothing is deleted, no refund is made and no email is sent. You can restore it.</p>
        : <p className="ad-note">It comes back exactly as it was, own domain included. A refund or a payment dispute still keeps it down. No email is sent.</p>}
      {takedown && (
        <div className="bf-field">
          <label className="bf-label" htmlFor={`${id}-why`}>Why is it coming down?</label>
          <textarea
            id={`${id}-why`} ref={whyBox} className="bf-input ad-td-why" value={reason} maxLength={REASON_MAX} required
            aria-describedby={`${id}-hint${error ? ` ${id}-err` : ''}`} aria-invalid={error ? true : undefined}
            onChange={e => setReason(e.target.value)}
          />
          <p id={`${id}-hint`} className="bf-hint">Kept on the site’s record with the time and who did it. For example: “Phishing: copies a bank’s login page”.</p>
        </div>
      )}
      {error && <p id={`${id}-err`} className="bf-error" role="alert">{error}</p>}
      <div className="ad-td-actions">
        <button type="submit" className={takedown ? 'ad-danger-btn' : 'sb-line-btn'} disabled={busy}>
          {busy ? (takedown ? 'Taking it down…' : 'Restoring…') : (takedown ? 'Yes, take it down' : 'Yes, restore it')}
        </button>
        <button type="button" className="sb-text-btn" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  )
}
