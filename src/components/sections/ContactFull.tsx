import { useState } from 'react'
import type { BusinessInfo, TradeConfig } from '../../types'
import { Icon } from '../ui/Icon'

interface Props {
  business: BusinessInfo
  trade: TradeConfig
}

const HOURS = [
  ['Mon — Fri', '7:00 — 18:00'],
  ['Saturday', '8:00 — 16:00'],
  ['Sunday', 'Emergencies only'],
  ['Bank holidays', 'Emergencies only'],
]

const JOB_TYPES = ['Emergency', 'Get a quote', 'Inspection', 'Something else']

export function ContactFull({ business }: Props) {
  const [jobType, setJobType] = useState('Get a quote')
  const phone = business.phone || '—'

  return (
    <section className="ff-section alt">
      <div className="ff-section-head">
        <span className="ff-eyebrow">Get in touch</span>
        <h2>Call us, or request a quote.</h2>
        <p>Most quotes within 15 minutes during working hours.</p>
      </div>
      <div className="ff-contact-grid">
        <div className="ff-contact-aside">
          <div className="ff-contact-strip">
            <div className="ff-contact-card">
              <div className="label"><Icon.Phone size={11} /> Phone</div>
              <span className="val">{phone}</span>
            </div>
            <div className="ff-contact-card">
              <div className="label"><Icon.Mail size={11} /> Email</div>
              <span className="val" style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                hello@{(business.name || 'business').toLowerCase().replace(/\s+/g, '')}.co.uk
              </span>
            </div>
          </div>
          <div className="ff-hours">
            <div className="row today">
              <span className="d">Today</span>
              <span className="t">7:00 — 18:00 · open</span>
            </div>
            {HOURS.map(([day, time]) => (
              <div className="row" key={day}>
                <span className="d">{day}</span>
                <span className="t">{time}</span>
              </div>
            ))}
            <div className="emerg">
              <div className="e-tile"><Icon.Bolt size={18} /></div>
              <div>
                <b>24/7 emergency line</b>
                <small>For urgent callouts any time</small>
              </div>
            </div>
          </div>
        </div>
        <div className="ff-form">
          <div className="ff-field">
            <label>What's the job?</label>
            <div className="ff-radios">
              {JOB_TYPES.map(jt => (
                <button key={jt} type="button" className={`ff-radio${jobType === jt ? ' on' : ''}`} onClick={() => setJobType(jt)}>
                  {jt}
                </button>
              ))}
            </div>
          </div>
          <div className="ff-field">
            <label>Your name</label>
            <input type="text" placeholder="e.g. Sarah Mitchell" readOnly />
          </div>
          <div className="ff-field">
            <label>Phone</label>
            <input type="tel" placeholder="07…" readOnly />
          </div>
          <div className="ff-field">
            <label>Tell us a bit more</label>
            <textarea placeholder="Describe the job…" rows={3} readOnly />
          </div>
          <button type="button" className="ff-btn ff-btn-primary" style={{ width: '100%' }}>
            Request callback <Icon.Arrow size={16} />
          </button>
        </div>
      </div>
      <div className="ff-map" data-label={`MAP · ${business.location || 'Local Area'}`} />
    </section>
  )
}
