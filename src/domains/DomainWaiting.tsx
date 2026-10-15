import { useId } from 'react'
import type { OwnDomain } from '../api/client'
import { DomainRecords, Rich } from './DomainRecords'
import { fillStep, GENERAL_GUIDE, PROVIDER_GUIDES } from './providerSteps'
import type { GuideStep } from './providerSteps'
import { isProviderId } from './providers'

interface Props {
  domain: OwnDomain
  checking: boolean
  onRecheck: () => void
}

/** The few steps at the customer's own domain company (or the general ones), with the record to copy. */
function ManualSteps({ domain }: { domain: OwnDomain }) {
  const guide = isProviderId(domain.provider) ? PROVIDER_GUIDES[domain.provider] : GENERAL_GUIDE
  const fill = (text: string) => fillStep(text, domain)
  const needsForwarding = domain.host === 'www' && !domain.apex
  const steps: GuideStep[] = [...guide.steps, ...(needsForwarding ? [{ text: `Optional, but worth it: ${guide.forwarding}` }] : [])]
  return (
    <ol className="od-steps">
      {steps.map(step => (
        <li key={step.text}>
          <Rich text={fill(step.text)} />
          {step.record && <DomainRecords records={domain.records} />}
        </li>
      ))}
    </ol>
  )
}

/** Connected on our side, waiting for the customer's DNS record: one click where we can, else their company's steps. */
export function DomainWaiting({ domain, checking, onRecheck }: Props) {
  const id = useId()
  const company = domain.providerName ?? 'your domain company'
  return (
    <>
      <p className="od-pill od-pill--waiting" role="status"><span aria-hidden="true" className="od-dot" />Waiting for your domain</p>
      <p><b>{domain.hostname}</b> is ready on our side. One change at {company} puts your site there.</p>
      {domain.oneClick ? (
        <>
          <a className="sb-main-btn ba-btn od-one-click" href={domain.oneClick.url}>Connect automatically with {domain.oneClick.name}</a>
          <p className="ba-small">You’ll sign in to {domain.oneClick.name}, check the change and approve it, then come straight back here.</p>
          <details className="od-details">
            <summary>Or set it up by hand</summary>
            <ManualSteps domain={domain} />
          </details>
        </>
      ) : (
        <section aria-labelledby={id}>
          <h2 id={id} className="od-h2">{domain.providerName ? `At ${domain.providerName}` : 'At your domain company'}</h2>
          <ManualSteps domain={domain} />
        </section>
      )}
      {domain.pointsElsewhere && (
        <p className="od-note">Right now {domain.hostname} points to <code>{domain.pointsElsewhere}</code>. Change that record to the one above.</p>
      )}
      <p className="ba-small">We keep checking by ourselves and email you the moment it’s live. It usually takes under an hour, sometimes up to a day.</p>
      <button type="button" className="sb-line-btn ba-btn" onClick={onRecheck} disabled={checking}>{checking ? 'Checking…' : 'Check now'}</button>
    </>
  )
}
