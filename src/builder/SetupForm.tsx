import { useState } from 'react'
import type { CSSProperties } from 'react'
import { z } from 'zod'
import type { TradeConfig, BusinessInfo } from '../types'
import type { ExtraId, Site } from '../site/schema'
import { Icon } from '../components/ui/Icon'
import { BrandColorCard } from './BrandColorCard'
import { ExtrasCard } from './ExtrasCard'

interface Props {
  trade: TradeConfig
  site: Site
  onBusinessChange: (patch: Partial<BusinessInfo>) => void
  onBrandColorChange: (color: string) => void
  onToggleExtra: (extra: ExtraId) => void
  onSubmit: () => void
  onBack: () => void
}

const emailSchema = z.string().trim().email()

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map(w => Array.from(w)[0]).join('').toUpperCase() || '??'
}

export function SetupForm({ trade, site, onBusinessChange, onBrandColorChange, onToggleExtra, onSubmit, onBack }: Props) {
  const info = site.business
  const [emailTouched, setEmailTouched] = useState(false)

  const set = (field: keyof BusinessInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onBusinessChange({ [field]: e.target.value })

  const emailValid = info.email.trim() === '' || emailSchema.safeParse(info.email).success
  const showEmailError = emailTouched && !emailValid
  const valid = info.name.trim().length > 0 && info.phone.trim().length > 0 && emailValid

  const displayName = info.name.trim() || `${trade.name} Co.`
  const initials = getInitials(info.name.trim() || trade.name)

  return (
    <>
      <div>
        <div className="mm-eyebrow">STEP <b>02</b> / 04 · THE BASICS</div>
        <h1 className="mm-title">Tell us about the business.</h1>
        <p className="mm-sub">A few details, that's it. Watch the preview build itself as you type — your actual site taking shape.</p>
      </div>

      <div className="mm-step2">
        {/* Form */}
        <div className="mm-form">
          <div className="mm-fieldset">
            <div className="mm-fld">
              <label htmlFor="fld-name">Business name <span className="req">REQUIRED</span></label>
              <input id="fld-name" value={info.name} onChange={set('name')} placeholder={`${trade.name} Co.`} maxLength={80} autoComplete="organization" />
            </div>
            <div className="mm-fld-2">
              <div className="mm-fld">
                <label htmlFor="fld-phone">Phone <span className="req">REQUIRED</span></label>
                <input id="fld-phone" value={info.phone} onChange={set('phone')} placeholder="(604) 555-0123" type="tel" maxLength={30} autoComplete="tel" />
              </div>
              <div className="mm-fld">
                <label htmlFor="fld-location">Town / City</label>
                <input id="fld-location" value={info.location} onChange={set('location')} placeholder="Vancouver, BC" maxLength={80} autoComplete="address-level2" />
              </div>
            </div>
            <div className="mm-fld">
              <label htmlFor="fld-email">Email <span className="sublab">so you can edit your site later</span></label>
              <input
                id="fld-email"
                value={info.email}
                onChange={set('email')}
                onBlur={() => setEmailTouched(true)}
                placeholder="you@example.com"
                type="email"
                maxLength={254}
                autoComplete="email"
                aria-invalid={showEmailError}
                aria-describedby={showEmailError ? 'fld-email-err' : undefined}
              />
              {showEmailError && (
                <div id="fld-email-err" className="mm-fld-err" role="alert">That email doesn't look right.</div>
              )}
            </div>
            <div className="mm-fld" style={{ maxWidth: 200 }}>
              <label htmlFor="fld-years">Years in business</label>
              <input id="fld-years" value={info.yearsInBusiness} onChange={set('yearsInBusiness')} placeholder="12" inputMode="numeric" maxLength={10} />
            </div>
            <div className="mm-fld">
              <label htmlFor="fld-about">Short about blurb <span className="sublab">optional</span></label>
              <textarea
                id="fld-about"
                value={info.about}
                onChange={set('about')}
                maxLength={160}
                placeholder="Family-owned and operated. Fully licensed and insured…"
                aria-describedby="fld-about-count"
              />
              <div id="fld-about-count" className="count">{info.about.length}/160</div>
            </div>
          </div>
        </div>

        {/* Right column: preview, colour, extras */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="mm-preview-card"
            style={{ '--accent': site.brandColor, '--navy': trade.colorScheme.navy } as CSSProperties}
          >
            <div className="mm-pc-label">
              <div className="mm-pc-dot" />
              <span>Live preview · updates as you type</span>
            </div>
            <div className="mm-pc-body">
              <div className="mm-id-lockup">
                <div className="mm-id-mark">
                  <b>{initials}</b>
                </div>
                <div>
                  <div className={`mm-id-name${!info.name.trim() ? ' empty' : ''}`}>{displayName}</div>
                  <div className="mm-id-tag">
                    {trade.name.toUpperCase()} · {(info.location.trim() || 'Your area').toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="mm-id-headline">{trade.tagline}</div>
              <div className="mm-id-meta">
                <div className={`mm-id-chip${!info.phone.trim() ? ' dim' : ''}`}>
                  <Icon.Phone size={12} /> {info.phone.trim() || '(604) 555-0123'}
                </div>
                <div className={`mm-id-chip${!info.yearsInBusiness.trim() ? ' dim' : ''}`}>
                  <Icon.Badge size={12} /> {info.yearsInBusiness.trim() || '12'}+ yrs
                </div>
                <div className={`mm-id-chip${!info.location.trim() ? ' dim' : ''}`}>
                  <Icon.Pin size={12} /> {info.location.trim() || 'Your area'}
                </div>
              </div>
            </div>
          </div>

          <BrandColorCard color={site.brandColor} onChange={onBrandColorChange} />
          <ExtrasCard extras={site.extras} onToggle={onToggleExtra} />
        </div>
      </div>

      <div className="mm-dock">
        <button type="button" className="mm-back" onClick={onBack}>
          ← Back
        </button>
        <span className="mm-dock-hint" aria-live="polite">
          {valid
            ? "Looking good — let's build it"
            : emailValid ? 'Add a business name and phone to continue' : 'Check your email address to continue'}
        </span>
        <button
          type="button"
          className="mm-cta"
          disabled={!valid}
          onClick={() => valid && onSubmit()}
        >
          Build my site <Icon.Arrow size={18} />
        </button>
      </div>
    </>
  )
}
