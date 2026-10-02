import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { z } from 'zod'
import type { BusinessInfo, SectionType, TradeConfig } from '../../types'
import type { Site } from '../../site/schema'
import { buildChecklist, isReadyToPublish, sectionForItem } from '../../site/checklist'
import { SitePage } from '../../components/site/SitePage'
import { photoNeeds } from '../../site/photoNeeds'
import { pageContent } from '../../site/pageContent'
import { PhotoNeeds } from './PhotoNeeds'
import { Icon } from '../../components/ui/Icon'
import './finish.css'

interface Props {
  trade: TradeConfig
  site: Site
  onBusinessChange: (patch: Partial<BusinessInfo>) => void
  /** Go back to the builder, opened on the section where something is added. */
  onEditSection: (section: SectionType) => void
  onPublish: () => void
  onBack: () => void
  /** Preview and resume links, when the builder saves to the server. */
  share?: ReactNode
}

const emailSchema = z.string().trim().email()

/** Final step: a quick check of what's live and what's hidden, the email, and publish. */
export function FinishStep({ trade, site, onBusinessChange, onEditSection, onPublish, onBack, share }: Props) {
  const emailId = useId()
  const [emailTouched, setEmailTouched] = useState(false)
  const items = buildChecklist(site, trade)
  const needs = photoNeeds(site, trade)
  const ready = isReadyToPublish(site)
  const email = site.business.email
  const showEmailError = emailTouched && email.trim() !== '' && !emailSchema.safeParse(email).success
  const name = site.business.name.trim() || `${trade.name} Co.`

  return (
    <>
      <div>
        <div className="mm-eyebrow">STEP <b>04</b> / 04 · GO LIVE</div>
        <h1 className="mm-title">{name} is ready.</h1>
        <p className="mm-sub">
          One last look. Anything you skipped stays hidden, and you can add it later from the link we email you.
        </p>
      </div>

      <div className="mm-finish">
        <div className="mm-finish-main">
          <PhotoNeeds needs={needs} style={site.style.resolved} content={pageContent(site, trade)} onAdd={onEditSection} />
          <ul className="mm-golive-list" aria-label="What goes on your site">
            {items.map(item => {
              const section = sectionForItem(site, trade, item.id)
              return (
                <li key={item.id} className={`mm-golive-item${item.done ? ' done' : ''}`}>
                  <span className="mm-check-mark" aria-hidden="true">{item.done && <Icon.Check size={12} />}</span>
                  <span className="mm-golive-label">{item.label}</span>
                  {item.done ? (
                    <span className="mm-golive-status">Live</span>
                  ) : section ? (
                    <button type="button" className="mm-golive-add" onClick={() => onEditSection(section)} aria-label={`Add ${item.label}`}>
                      Hidden · Add
                    </button>
                  ) : (
                    <span className="mm-golive-status hidden">Hidden</span>
                  )}
                </li>
              )
            })}
          </ul>

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
          {share}
        </div>

        <aside className="mm-finish-preview-wrap" aria-label="Live preview">
          <div className="mm-pc-label">
            <div className="mm-pc-dot" />
            <span>Exactly what goes live</span>
          </div>
          {/* The scroll box stays interactive so it can scroll; only the site inside is inert. */}
          <div className="mm-finish-preview" role="region" tabIndex={0} aria-label="Preview of your live site, scrollable">
            <div inert>
              <SitePage site={site} trade={trade} />
            </div>
          </div>
        </aside>
      </div>

      <div className="mm-dock">
        <button type="button" className="mm-back" onClick={onBack}>← Back</button>
        <span className="mm-dock-hint" aria-live="polite">
          {ready ? 'One payment. No monthly fees.' : 'Add your email to publish'}
        </span>
        <button type="button" className="mm-cta" disabled={!ready} onClick={() => ready && onPublish()}>
          Publish my site <Icon.Arrow size={18} />
        </button>
      </div>
    </>
  )
}
