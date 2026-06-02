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
    <section style={{ backgroundColor: 'var(--surface)', padding: '36px 18px 32px' }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: 'var(--accent-ink)', marginBottom: '8px',
      }}>
        Get in touch
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px',
        lineHeight: 1.15, color: 'var(--ink)', marginBottom: '8px',
      }}>
        Call us, or request a quote.
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.55, marginBottom: '16px' }}>
        Most quotes within 15 minutes during working hours. Emergency? Just call.
      </p>

      {/* Contact cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '5px' }}>
            <Icon.Phone size={11} /> Phone
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--navy)', fontSize: '14px' }}>{phone}</span>
        </div>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '5px' }}>
            <Icon.Mail size={11} /> Email
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--navy)', fontSize: '12px', wordBreak: 'break-all' }}>
            hello@{(business.name || 'business').toLowerCase().replace(/\s+/g, '')}.co.uk
          </span>
        </div>
      </div>

      {/* Hours */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '11px 14px', background: 'var(--accent-tint)', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', color: 'var(--accent-ink)' }}>Today</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-ink)' }}>7:00 — 18:00 · open</span>
        </div>
        {HOURS.map(([day, time]) => (
          <div key={day} style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '11px 14px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px', color: 'var(--ink)' }}>{day}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--muted)' }}>{time}</span>
          </div>
        ))}
        <div style={{ background: 'var(--navy)', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent)' }}>
            <Icon.Bolt size={18} />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: '#fff', lineHeight: 1.2 }}>24/7 emergency line</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', marginTop: '2px' }}>For urgent callouts any time</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '18px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--ink)' }}>What's the job?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {JOB_TYPES.map(jt => (
              <button
                key={jt}
                onClick={() => setJobType(jt)}
                style={{
                  padding: '11px 8px', borderRadius: '12px', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '12.5px',
                  border: `1.5px solid ${jobType === jt ? 'var(--accent)' : 'var(--line)'}`,
                  background: jobType === jt ? 'var(--accent-tint)' : 'var(--bg)',
                  color: jobType === jt ? 'var(--accent-ink)' : 'var(--muted)',
                  transition: 'all 0.15s',
                }}
              >
                {jt}
              </button>
            ))}
          </div>
        </div>

        {[['Your name', 'text', 'e.g. Sarah Mitchell'], ['Phone', 'tel', '07…']].map(([label, type, placeholder]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--ink)' }}>{label}</label>
            <input type={type} placeholder={placeholder} readOnly style={{
              padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--line)',
              fontSize: '15px', background: 'var(--bg)', color: 'var(--muted)', width: '100%',
            }} />
          </div>
        ))}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--ink)' }}>Tell us a bit more</label>
          <textarea readOnly placeholder="Describe the job…" rows={3} style={{
            padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--line)',
            fontSize: '15px', background: 'var(--bg)', color: 'var(--muted)',
            resize: 'none', fontFamily: 'inherit', width: '100%',
          }} />
        </div>

        <button style={{
          height: '52px', borderRadius: '12px', border: 'none',
          background: 'var(--accent)', color: '#fff',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          boxShadow: 'var(--shadow-cta)', cursor: 'pointer', width: '100%',
        }}>
          Request callback <Icon.Arrow size={16} />
        </button>
        <p style={{ fontSize: '11.5px', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
          We'll never share your details. Typical reply: <strong style={{ color: 'var(--ink)' }}>under 15 minutes</strong>.
        </p>
      </div>
    </section>
  )
}
