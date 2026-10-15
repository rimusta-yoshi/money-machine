import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { BRAND, PAGES } from '../brand/config'
import { NewTabLink } from '../builder/ui/LegalLinks'
import { checkDomain } from './domainName'

interface Props {
  freeUrl: string | null
  busy: boolean
  /** Resolves to an error message, or null when it's connected. */
  onConnect: (domain: string) => Promise<string | null>
}

const bare = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

/** Step one: type the domain. Checked here as they type, and properly by the server. */
export function DomainForm({ freeUrl, busy, onConnect }: Props) {
  const id = useId()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const check = checkDomain(value, [BRAND.domain, ...BRAND.pastDomains])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!check.ok) { setError(check.message); return }
    setError(await onConnect(value))
  }

  return (
    <>
      <p>Got a domain like smithplumbing.co.uk? Connect it and your site opens there. It’s included in what you paid: nothing extra, nothing monthly.</p>
      <form onSubmit={submit} noValidate>
        <div className="bf-field">
          <label htmlFor={id} className="bf-label">Your domain</label>
          <input
            id={id} className="bf-input" type="text" inputMode="url" autoComplete="off" spellCheck={false} maxLength={300}
            placeholder="smithplumbing.co.uk" value={value} onChange={e => { setValue(e.target.value); setError(null) }}
            aria-invalid={!!error} aria-describedby={`${id}-hint ${id}-error`}
          />
          <p id={`${id}-hint`} className="bf-hint">
            {check.ok ? <>Your site will open at <b>{check.hostname}</b>.</> : 'Just the domain, without https:// or www.'}
            {freeUrl && <> Your free address, {bare(freeUrl)}, keeps working and sends people there.</>}
          </p>
          <p id={`${id}-error`} className="bf-error" role="alert">{error ?? ''}</p>
        </div>
        <button type="submit" className="sb-main-btn ba-btn" disabled={busy}>{busy ? 'Connecting…' : 'Connect my domain'}</button>
      </form>
      <section className="od-aside" aria-labelledby={`${id}-buy`}>
        <h2 id={`${id}-buy`} className="od-h2">Don’t have a domain yet?</h2>
        <p>
          Buy one from <NewTabLink href={BRAND.domainShop.url}>{BRAND.domainShop.name}</NewTabLink> (or any domain company you like), then come
          back here to connect it. A .co.uk is usually around £10 a year, and it’s yours, renewed with them.
        </p>
        {BRAND.domainShop.disclosure && <p className="ba-small">{BRAND.domainShop.disclosure}</p>}
      </section>
      <p className="ba-small">Rather put your site online somewhere else yourself? <NewTabLink href={PAGES.hostingGuide}>Host your own site</NewTabLink></p>
    </>
  )
}
