import { useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { cleanRequestedType, MAX_REQUEST_CHARS } from '../../analytics/requested'
import { closestPack } from '../../packs/match'
import { tradeById } from '../../trades'
import type { TradeConfig, TradeId } from '../../types'
import { TextField } from '../ui/TextField'

interface Props {
  onPick: (trade: TradeConfig) => void
  /** Counts the request for the dashboard (anonymous; nothing else is sent). */
  onRequest?: (text: string, closest: TradeId | null) => void
}

type Answer = { kind: 'closest'; trade: TradeConfig } | { kind: 'none' } | { kind: 'unclear' }

/**
 * "My business isn't listed", under the trade picker: they say what the business is, we note it
 * (anonymously, for choosing the next business types) and suggest the closest type to start
 * with for now. No new builder flow: starting still means picking one of the trades.
 * Inside the basics form, so it has no <form> of its own: Enter here never submits the page.
 */
export function NotListed({ onPick, onRequest }: Props) {
  const regionId = useId()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)
  const sent = useRef(new Set<string>())

  const ask = () => {
    const clean = cleanRequestedType(text)
    if (!clean) { setAnswer({ kind: 'unclear' }); return }
    const pack = closestPack(clean)
    if (!sent.current.has(clean)) {
      sent.current.add(clean)
      onRequest?.(clean, pack?.id ?? null)
    }
    setAnswer(pack ? { kind: 'closest', trade: tradeById[pack.id] } : { kind: 'none' })
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    ask()
  }

  return (
    <div className="bb-notlisted">
      <button type="button" className="sb-link-btn" aria-expanded={open} aria-controls={regionId} onClick={() => setOpen(o => !o)}>
        My business isn’t listed
      </button>
      <div id={regionId} className="bb-notlisted-box" hidden={!open}>
        <TextField
          label="What’s your business?" value={text} onValue={v => { setText(v); setAnswer(null) }} onKeyDown={onKeyDown}
          placeholder="e.g. dog groomer, window cleaner" maxLength={MAX_REQUEST_CHARS} autoComplete="off"
          hint="Just a few words. We use them to choose which businesses to add next."
        />
        <button type="button" className="sb-line-btn" onClick={ask}>Find the closest match</button>
        <div role="status" aria-live="polite" className="bb-notlisted-answer">
          {answer?.kind === 'unclear' && <p>Tell us in a few words, like “dog groomer”.</p>}
          {answer?.kind === 'none' && <p>Thanks, we’ve noted it. Nothing we have is close yet: pick the trade that fits best and change the wording to suit you.</p>}
          {answer?.kind === 'closest' && (
            <>
              <p>Thanks, we’ve noted it. For now, the closest we have is <b>{answer.trade.name}</b>. Start with it and change the services and wording to fit.</p>
              <button type="button" className="sb-line-btn" onClick={() => onPick(answer.trade)}>Start with {answer.trade.name}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
