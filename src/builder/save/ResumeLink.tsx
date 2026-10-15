import { useId, useState } from 'react'
import { z } from 'zod'
import { ApiError } from '../../api/client'
import { LIMITS } from '../../site/limits'
import { TextField } from '../ui/TextField'

type State = { s: 'idle' } | { s: 'sending' } | { s: 'sent'; message: string } | { s: 'error'; message: string }

const emailSchema = z.string().trim().email().max(LIMITS.email)

interface Props {
  /** Saves the site to the server and emails the link; resolves to what to tell the customer. */
  send: (email: string, remind: boolean) => Promise<string>
  /** The business email from the basics, if they gave one. */
  initialEmail?: string
}

/**
 * "Email me a link to finish on my computer": the site is saved to the server and a link to
 * carry on is emailed, with one reminder a few days later only if they tick it.
 */
export function ResumeLink({ send, initialEmail = '' }: Props) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(initialEmail)
  const [remind, setRemind] = useState(false)
  const [state, setState] = useState<State>({ s: 'idle' })
  const [touched, setTouched] = useState(false)
  const valid = emailSchema.safeParse(email).success

  const submit = async () => {
    setTouched(true)
    if (!valid || state.s === 'sending') return
    setState({ s: 'sending' })
    try {
      setState({ s: 'sent', message: await send(email.trim(), remind) })
    } catch (err) {
      setState({ s: 'error', message: err instanceof ApiError ? err.message : 'We couldn’t send that just now. Check your connection and try again.' })
    }
  }

  return (
    <div className="bd-resume">
      <button type="button" className="sb-line-btn bd-resume-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(o => !o)}>
        Email me a link to finish on my computer
      </button>
      <form
        id={panelId}
        className="bd-resume-form"
        hidden={!open}
        noValidate
        onSubmit={e => { e.preventDefault(); void submit() }}
      >
        <p className="mm-note">We’ll save your site as it is and email you a link to carry on from any computer.</p>
        <TextField
          label="Your email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onValue={setEmail}
          maxLength={LIMITS.email}
          error={touched && !valid ? 'Check your email address, e.g. name@example.co.uk' : null}
        />
        <label className="bd-resume-remind">
          <input type="checkbox" checked={remind} onChange={e => setRemind(e.target.checked)} />
          Remind me once in a few days if I haven’t finished
        </label>
        <button type="submit" className="sb-main-btn bd-resume-send" aria-disabled={state.s === 'sending' || undefined}>
          {state.s === 'sending' ? 'Sending…' : 'Email me the link'}
        </button>
        <p className={`bd-resume-status${state.s === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
          {state.s === 'sent' || state.s === 'error' ? state.message : ''}
        </p>
      </form>
    </div>
  )
}
