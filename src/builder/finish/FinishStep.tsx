import { useId, useState } from 'react'
import { z } from 'zod'
import type { BusinessInfo, TradeConfig } from '../../types'
import type { Site, SiteContent } from '../../site/schema'
import { buildChecklist, isReadyToPublish } from '../../site/checklist'
import { SitePage } from '../../components/site/SitePage'
import { Icon } from '../../components/ui/Icon'
import { ChecklistItemEditor } from './ChecklistItemEditor'
import './finish.css'

interface Props {
  trade: TradeConfig
  site: Site
  onBusinessChange: (patch: Partial<BusinessInfo>) => void
  onContentChange: (patch: Partial<SiteContent>) => void
  onPublish: () => void
  onBack: () => void
}

const emailSchema = z.string().trim().email()

export function FinishStep({ trade, site, onBusinessChange, onContentChange, onPublish, onBack }: Props) {
  const emailId = useId()
  const [emailTouched, setEmailTouched] = useState(false)
  const items = buildChecklist(site, trade)
  const doneCount = items.filter(i => i.done).length
  const ready = isReadyToPublish(site)
  const email = site.business.email
  const showEmailError = emailTouched && email.trim() !== '' && !emailSchema.safeParse(email).success

  return (
    <>
      <div>
        <div className="mm-eyebrow">STEP <b>04</b> / 04 · FINISH</div>
        <h1 className="mm-title">Make it yours, then go live.</h1>
        <p className="mm-sub">
          Anything you skip stays hidden — nothing made up ever goes on your site. The preview shows exactly what will be published.
        </p>
      </div>

      <div className="mm-finish">
        <div className="mm-finish-main">
          <div className="mm-form">
            <div className="mm-fld">
              <label htmlFor={emailId}>Your email <span className="req">REQUIRED</span></label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                placeholder="you@example.com"
                onChange={e => onBusinessChange({ email: e.target.value })}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={showEmailError}
                aria-describedby={`${emailId}-hint`}
              />
              <div id={`${emailId}-hint`} className={showEmailError ? 'mm-fld-err' : 'mm-fld-hint'}>
                {showEmailError ? "That email doesn't look right." : "We'll send your login link here, so you can edit your site any time."}
              </div>
            </div>
          </div>

          <h2 className="mm-finish-h2">
            Your details <span className="mm-finish-count">{doneCount}/{items.length} added</span>
          </h2>
          <ul className="mm-checklist">
            {items.map(item => (
              <li key={item.id}>
                <details className={`mm-check${item.done ? ' done' : ''}`}>
                  <summary>
                    <span className="mm-check-mark" aria-hidden="true">{item.done && <Icon.Check size={12} />}</span>
                    <span className="mm-check-label">{item.label}</span>
                    <span className="mm-check-status">{item.done ? 'Added' : 'Hidden until added'}</span>
                  </summary>
                  <div className="mm-check-body">
                    <ChecklistItemEditor id={item.id} site={site} trade={trade} onContentChange={onContentChange} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>

        <aside className="mm-finish-preview-wrap" aria-label="Live preview">
          <div className="mm-pc-label">
            <div className="mm-pc-dot" />
            <span>Exactly what goes live</span>
          </div>
          {/* Visual only: the form on the left is the accessible way to edit. */}
          {/* The scroll box stays interactive so it can scroll; only the site inside is inert. */}
          <div className="mm-finish-preview" role="region" tabIndex={0} aria-label="Preview of your live site, scrollable">
            <div inert>
              <SitePage site={site} trade={trade} mode="live" />
            </div>
          </div>
        </aside>
      </div>

      <div className="mm-dock">
        <button type="button" className="mm-back" onClick={onBack}>← Back</button>
        <span className="mm-dock-hint" aria-live="polite">
          {ready ? 'Ready when you are' : 'Add your email to publish'}
        </span>
        <button type="button" className="mm-cta" disabled={!ready} onClick={() => ready && onPublish()}>
          Publish my site <Icon.Arrow size={18} />
        </button>
      </div>
    </>
  )
}
