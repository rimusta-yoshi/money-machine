import { useId, useState } from 'react'
import { Icon } from '../ui/Icon'
import { ExampleTag, PhoneLink, SectionShell } from './parts'
import type { SectionProps } from './types'

const JOB_TYPES = ['Emergency', 'Get a quote', 'Inspection', 'Something else']

export function ContactFull({ business, content, mode }: SectionProps) {
  const { hours, emergency } = content
  const email = business.email.trim()

  return (
    <SectionShell
      id="contact"
      className="ff-section alt"
      eyebrow="Get in touch"
      title="Call us, or request a quote."
      sub="We'll get back to you as soon as we can."
    >
      <div className="ff-contact-grid">
        <div className="ff-contact-aside">
          <div className="ff-contact-strip">
            <div className="ff-contact-card">
              <p className="label"><Icon.Phone size={11} /> Phone</p>
              <PhoneLink phone={business.phone} className="val">{business.phone}</PhoneLink>
            </div>
            {email && (
              <div className="ff-contact-card">
                <p className="label"><Icon.Mail size={11} /> Email</p>
                <a className="val ff-break" href={`mailto:${email}`}>{email}</a>
              </div>
            )}
          </div>
          {(hours || emergency?.value) && (
            <div className="ff-hours">
              {hours && (
                <dl aria-label="Opening hours">
                  {hours.value.map(({ day, time }) => (
                    <div className="row" key={day}>
                      <dt className="d">{day}</dt>
                      <dd className="t">{time}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {hours?.example && <p className="row"><ExampleTag /></p>}
              {emergency?.value && (
                <div className="emerg">
                  <div className="e-tile"><Icon.Bolt size={18} /></div>
                  <p>
                    <b>Emergency call-outs</b>
                    <small>Call us for urgent jobs {emergency.example && <ExampleTag />}</small>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <QuoteForm />
      </div>
      {mode === 'builder' && <div className="ff-map" aria-hidden="true" />}
    </SectionShell>
  )
}

/** Enquiry form. Sending is wired up in phase 3; until then it does nothing. */
function QuoteForm() {
  const id = useId()
  const [jobType, setJobType] = useState('Get a quote')

  return (
    <form className="ff-form" aria-label="Request a quote" onSubmit={e => e.preventDefault()}>
      <fieldset className="ff-field">
        <legend>What's the job?</legend>
        <div className="ff-radios">
          {JOB_TYPES.map(jt => (
            <label key={jt} className={`ff-radio${jobType === jt ? ' on' : ''}`}>
              <input
                type="radio"
                className="ff-sr-only"
                name={`${id}-job`}
                value={jt}
                checked={jobType === jt}
                onChange={() => setJobType(jt)}
              />
              {jt}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="ff-field">
        <label htmlFor={`${id}-name`}>Your name</label>
        <input id={`${id}-name`} name="name" type="text" autoComplete="name" required maxLength={80} />
      </div>
      <div className="ff-field">
        <label htmlFor={`${id}-phone`}>Phone</label>
        <input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" required maxLength={30} />
      </div>
      <div className="ff-field">
        <label htmlFor={`${id}-msg`}>Tell us a bit more</label>
        <textarea id={`${id}-msg`} name="message" rows={3} maxLength={1000} />
      </div>
      <button type="submit" className="ff-btn ff-btn-primary" style={{ width: '100%' }}>
        Request callback <Icon.Arrow size={16} />
      </button>
    </form>
  )
}
