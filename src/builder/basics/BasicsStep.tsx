import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { BusinessInfo, TradeConfig } from '../../types'
import type { Site } from '../../site/schema'
import { LIMITS } from '../../site/limits'
import { Logo } from '../../brand/Logo'
import { basicsGaps } from '../steps'
import type { BasicsGap } from '../steps'
import { TextField } from '../ui/TextField'
import { useNarrow } from '../useNarrow'
import { TradePicker } from './TradePicker'
import { BasicsPreview, BasicsPreviewCard } from './BasicsPreview'
import './basics.css'

type Basics = Pick<BusinessInfo, 'name' | 'location' | 'phone'>

interface Props {
  trade: TradeConfig | null
  site: Site | null
  onPickTrade: (trade: TradeConfig, business: Partial<BusinessInfo>) => void
  onBusinessChange: (patch: Partial<BusinessInfo>) => void
  onNext: () => void
  /** Save status, shown only when something went wrong (a saved draft didn't reopen). */
  status?: ReactNode
  /** Offer "Already paid? Get your edit link" (when this build has a server). */
  lostLink?: boolean
}

const EMPTY: Basics = { name: '', location: '', phone: '' }

const NEEDS: Record<BasicsGap, string> = { trade: 'your trade', name: 'your business name', phone: 'a phone number' }
const needsLine = (gaps: BasicsGap[]) =>
  `Just need ${gaps.map(g => NEEDS[g]).join(gaps.length > 2 ? ', ' : ' and ').replace(/, ([^,]*)$/, ' and $1')} to carry on.`

/**
 * Step 1: trade, business name, town and phone, with "your site, so far" beside them.
 * Desktop shows one form; phones split it in two (trade first, then the three fields).
 * Typing before a trade is picked is kept here and handed over with the trade.
 */
export function BasicsStep({ trade, site, onPickTrade, onBusinessChange, onNext, status, lostLink }: Props) {
  const narrow = useNarrow()
  const [stage, setStage] = useState<0 | 1>(0)
  const [pending, setPending] = useState<Basics>(EMPTY)
  const [message, setMessage] = useState<string | null>(null)
  const tradeRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const phoneRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  const values: Basics = site ? site.business : pending
  const set = (field: keyof Basics) => (value: string) => {
    setMessage(null)
    if (site) onBusinessChange({ [field]: value })
    else setPending(p => ({ ...p, [field]: value }))
  }
  const pick = (t: TradeConfig) => {
    setMessage(null)
    onPickTrade(t, site ? {} : pending)
  }

  const gapsNow = (): BasicsGap[] => (site ? basicsGaps(site) : ['trade', ...basicsGaps({ business: pending })])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const gaps = gapsNow()
    if (gaps.length === 0) { onNext(); return }
    setMessage(needsLine(gaps))
    const fields = { trade: tradeRef, name: nameRef, phone: phoneRef }
    fields[gaps[0]].current?.focus()
  }
  const toDetails = () => {
    if (!trade) { setMessage(needsLine(['trade'])); tradeRef.current?.focus(); return }
    setMessage(null)
    setStage(1)
  }

  const fields = (
    <>
      <TextField label="Business name" value={values.name} onValue={set('name')} placeholder="e.g. Hartley & Sons" autoComplete="organization" count={LIMITS.name} inputRef={nameRef} />
      <TextField label="Where do you work?" value={values.location} onValue={set('location')} placeholder="Town or area" autoComplete="address-level2" count={LIMITS.location} />
      <TextField
        label="Phone number" type="tel" inputMode="tel" autoComplete="tel" maxLength={LIMITS.phone} inputRef={phoneRef}
        value={values.phone} onValue={set('phone')} placeholder="The number customers should ring"
        hint={narrow ? undefined : 'Shown on your site so customers can call you in one tap.'}
      />
    </>
  )
  const note = <p className="bb-message" role="status" aria-live="polite">{message ?? ''}</p>
  const paidAlready = lostLink && <p className="bb-paid"><a href="#lost-link">Already paid? Get your edit link</a></p>

  if (narrow) {
    return (
      <div className="bb bb--phone sb-ui">
        <header className="bb-phone-top">
          {stage === 1
            ? <button type="button" className="bb-back" onClick={() => setStage(0)} aria-label="Back to trade">←</button>
            : <Logo href="/" markOnly />}
          {status}
          <div className="bb-progress">
            <span>Step {stage + 1} of 2</span>
            <span className="bb-seg bb-seg--1 on" aria-hidden="true" />
            <span className={`bb-seg bb-seg--2${stage === 1 ? ' on' : ''}`} aria-hidden="true" />
          </div>
        </header>
        {stage === 0 ? (
          <main className="bb-stage sb-in">
            <h1 className="bb-h1">What's your trade?</h1>
            <TradePicker value={trade?.id ?? null} onPick={pick} variant="rows" legend="Your trade" legendHidden firstRef={tradeRef} />
            {note}
            <button type="button" className="sb-main-btn bb-wide-btn" onClick={toDetails}>Continue</button>
            {paidAlready}
          </main>
        ) : (
          <main className="sb-in">
            <form className="bb-stage" onSubmit={submit} noValidate>
              <h1 className="bb-h1 bb-h1--sm">Nice. A few details for your {trade?.name.toLowerCase()} site.</h1>
              {fields}
              {trade && <BasicsPreviewCard trade={trade} business={values} />}
              {note}
              <button type="submit" className="sb-main-btn bb-wide-btn">Next: your look</button>
            </form>
          </main>
        )}
      </div>
    )
  }

  return (
    <div className="bb sb-ui">
      <header className="bb-top">
        <Logo href="/" />
        {status ?? <span className="bb-free">Free until you go live</span>}
      </header>
      <main className="bb-main">
        <form className="bb-form" onSubmit={submit} noValidate>
          <div className="bb-intro">
            <h1 className="bb-h1">Let's start with the basics</h1>
            <p className="bb-lead">Four quick things. You can change them all later.</p>
          </div>
          <TradePicker value={trade?.id ?? null} onPick={pick} variant="chips" legend="Your trade" firstRef={tradeRef} />
          {fields}
          {note}
          <button type="submit" className="sb-main-btn bb-submit">Next: your look</button>
          {paidAlready}
        </form>
        <BasicsPreview trade={trade} business={values} />
      </main>
    </div>
  )
}
