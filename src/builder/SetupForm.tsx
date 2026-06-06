import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { TradeConfig, BusinessInfo } from '../types'
import { Icon } from '../components/ui/Icon'

interface Props {
  trade: TradeConfig
  brandColor: string
  onBrandColorChange: (color: string) => void
  onSubmit: (info: BusinessInfo) => void
  onBack: () => void
}

const EMPTY: BusinessInfo = { name: '', phone: '', location: '', about: '', yearsInBusiness: '' }

const PRESETS = [
  '#1E88E5', // blue
  '#2563EB', // indigo
  '#0891B2', // teal
  '#3F8F4F', // green
  '#F59E0B', // amber
  '#EA580C', // orange
  '#C2410C', // burnt orange
  '#DC2626', // red
  '#7C3AED', // purple
  '#374151', // slate
]

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map(w => Array.from(w)[0]).join('').toUpperCase() || '??'
}

export function SetupForm({ trade, brandColor, onBrandColorChange, onSubmit, onBack }: Props) {
  const [info, setInfo] = useState<BusinessInfo>(EMPTY)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const set = (field: keyof BusinessInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInfo(prev => ({ ...prev, [field]: e.target.value }))

  const valid = info.name.trim().length > 0 && info.phone.trim().length > 0
  const aboutLen = info.about.length

  const displayName = info.name.trim() || `${trade.name} Co.`
  const initials = getInitials(info.name.trim() || trade.name)

  return (
    <>
      <div>
        <div className="mm-eyebrow">STEP <b>02</b> / 03 · THE BASICS</div>
        <h1 className="mm-title">Tell us about the business.</h1>
        <p className="mm-sub">Five things, that's it. Watch the preview build itself as you type — your actual site taking shape.</p>
      </div>

      <div className="mm-step2">
        {/* Form */}
        <div className="mm-form">
          <div className="mm-fieldset">
            <div className="mm-fld">
              <label>Business name <span className="req">REQUIRED</span></label>
              <input value={info.name} onChange={set('name')} placeholder={`${trade.name} Co.`} />
            </div>
            <div className="mm-fld-2">
              <div className="mm-fld">
                <label>Phone <span className="req">REQUIRED</span></label>
                <input value={info.phone} onChange={set('phone')} placeholder="(604) 555-0123" type="tel" />
              </div>
              <div className="mm-fld">
                <label>Town / City</label>
                <input value={info.location} onChange={set('location')} placeholder="Vancouver, BC" />
              </div>
            </div>
            <div className="mm-fld" style={{ maxWidth: 200 }}>
              <label>Years in business</label>
              <input value={info.yearsInBusiness} onChange={set('yearsInBusiness')} placeholder="12" inputMode="numeric" />
            </div>
            <div className="mm-fld">
              <label>Short about blurb <span className="sublab">optional</span></label>
              <textarea
                value={info.about}
                onChange={set('about')}
                maxLength={160}
                placeholder="Family-owned and operated. Fully licensed and insured…"
              />
              <div className="count">{aboutLen}/160</div>
            </div>
          </div>
        </div>

        {/* Right column: preview card + colour card stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Live preview card */}
          <div
            className="mm-preview-card"
            style={{ '--accent': brandColor, '--navy': trade.colorScheme.navy } as CSSProperties}
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
              <div className="mm-id-stars">
                ★★★★★ <span>4.9 · 312 reviews</span>
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

          {/* Brand colour card */}
          <div className="mm-color-card">
            <div className="mm-color-card-label">
              <span>Brand colour</span>
            </div>
            <div className="mm-color-card-body">
              <div className="mm-color-big">
                <div
                  className="mm-color-swatch-lg"
                  style={{ background: brandColor } as CSSProperties}
                />
                <span className="mm-color-hex">{brandColor.toUpperCase()}</span>
                <button
                  type="button"
                  className="mm-color-custom-btn"
                  onClick={() => colorInputRef.current?.click()}
                >
                  <Icon.Brush size={13} /> Custom
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={brandColor}
                    onChange={e => onBrandColorChange(e.target.value)}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </button>
              </div>
              <div className="mm-color-presets">
                {PRESETS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`mm-color-preset${brandColor.toLowerCase() === c.toLowerCase() ? ' active' : ''}`}
                    style={{ background: c, color: c } as CSSProperties}
                    onClick={() => onBrandColorChange(c)}
                    aria-label={`Set brand colour to ${c}`}
                    aria-pressed={brandColor.toLowerCase() === c.toLowerCase()}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="mm-dock">
        <button type="button" className="mm-back" onClick={onBack}>
          ← Back
        </button>
        <span className="mm-dock-hint">
          {valid ? "Looking good — let's build it" : 'Add a business name and phone to continue'}
        </span>
        <button
          type="button"
          className="mm-cta"
          disabled={!valid}
          onClick={() => valid && onSubmit(info)}
        >
          Build my site <Icon.Arrow size={18} />
        </button>
      </div>
    </>
  )
}
