import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import { ApiError } from '../../api/client'
import type { Api } from '../../api/client'
import { LIMITS } from '../../site/limits'
import { TextField } from '../ui/TextField'
import { AccountShell } from './AccountShell'

interface Props {
  api: Api
}

const emailSchema = z.string().trim().email()

/** "Lost your edit link?": a fresh one goes to the email the site was paid with. */
export function LostLinkScreen({ api }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const emailRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!emailSchema.safeParse(email).success) {
      setError("That email doesn't look right. Check for a missing @ or dot.")
      emailRef.current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      setSent(await api.requestEditLink(email.trim()))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We couldn’t send that just now. Please try again.')
    }
    setBusy(false)
  }

  if (sent) {
    return (
      <AccountShell title="Check your email">
        <p role="status">{sent}</p>
        <p className="ba-small">The link opens your site in the builder. Saving your changes puts them live, free.</p>
      </AccountShell>
    )
  }

  return (
    <AccountShell title="Lost your edit link?">
      <p>Enter the email you paid with and we’ll send a new link to edit your site.</p>
      <form onSubmit={submit} noValidate>
        <TextField
          label="Your email" type="email" autoComplete="email" maxLength={LIMITS.email} placeholder="you@example.com"
          value={email} onValue={setEmail} error={error} inputRef={emailRef}
        />
        <button type="submit" className="sb-main-btn ba-btn" disabled={busy}>{busy ? 'Sending…' : 'Send me a new link'}</button>
      </form>
      <p className="ba-small"><a href="/build/">Back to the builder</a></p>
    </AccountShell>
  )
}
