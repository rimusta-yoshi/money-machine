import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { THEMES } from '../../gen'
import type { Shop } from '../../api/client'
import type { Draft } from '../../api/useDraft'
import type { BusinessInfo, SectionType, TradeConfig } from '../../types'
import type { Site } from '../../site/schema'
import { buildChecklist, sectionForItem } from '../../site/checklist'
import { photoNeeds } from '../../site/photoNeeds'
import { pageContent } from '../../site/pageContent'
import { siteSections } from '../../site/sections'
import type { Step } from '../steps'
import { PhotoNeeds } from './PhotoNeeds'
import { GoLivePanel } from './GoLivePanel'
import './finish.css'

interface Props {
  trade: TradeConfig
  site: Site
  onBusinessChange: (patch: Partial<BusinessInfo>) => void
  /** Go back to the builder, opened on the section where something is added. */
  onEditSection: (section: SectionType) => void
  /** Back to the basics or the look step. */
  onEditStep: (step: Extract<Step, 'basics' | 'look'>) => void
  draft: Draft | null
  adminPublish: boolean
  domain: string
  verify: () => Promise<Site | null>
  /** Back from Stripe without paying. */
  cancelled?: boolean
  /** The server's price and whether orders are open. */
  shop?: Shop | null
  /** Start a new site from scratch. */
  onReset: () => void
  /** The preview link, when the builder has a server. */
  share?: ReactNode
}

const Tick = () => (
  <span className="bg-tick" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
  </span>
)

/** Final step: what's ready, photos worth adding, anything still hidden, and the go-live panel. */
export function FinishStep({ trade, site, onBusinessChange, onEditSection, onEditStep, draft, adminPublish, domain, verify, cancelled, shop, onReset, share }: Props) {
  const shareId = useId()
  const [sharing, setSharing] = useState(false)
  const b = site.business
  const name = b.name.trim() || `${trade.name} Co.`
  const needs = photoNeeds(site, trade)
  // Photos a picked layout needs are nudged above, so they aren't listed twice.
  const nudged = new Set(needs.map(n => `photos.${n.slot}`))
  const hidden = buildChecklist(site, trade).filter(i => !i.done && !nudged.has(i.id))
  const count = siteSections(trade, site).length
  const where = [`${trade.name.toLowerCase()}${b.location.trim() ? ` in ${b.location.trim()}` : ''}`, b.phone.trim()].filter(Boolean).join(', ')

  return (
    <main className="bg">
      <section aria-labelledby="ready-h" className="bg-main">
        <h1 id="ready-h" className="bs-h1 bg-h1">Nearly there, {name}</h1>
        <p className="bs-lead">
          {needs.length ? 'Here’s what’s ready, and what’s worth adding before you go live.' : 'Here’s what’s ready. Anything you skipped stays hidden, and you can add it later.'}
        </p>

        <ul className="bg-list" aria-label="What’s ready">
          <li className="bg-row">
            <Tick />
            <span className="bg-row-text"><b>Basics</b> · {where}</span>
            <button type="button" className="sb-link-btn" onClick={() => onEditStep('basics')} aria-label="Edit basics">Edit</button>
          </li>
          <li className="bg-row">
            <Tick />
            <span className="bg-row-text">
              <b>Your look</b> · {THEMES[site.style.theme].label} in your colour
              <span className="bg-colour" style={{ background: site.brandColor }} aria-hidden="true" />
            </span>
            <button type="button" className="sb-link-btn" onClick={() => onEditStep('look')} aria-label="Edit your look">Edit</button>
          </li>
          <li className="bg-row">
            <Tick />
            <span className="bg-row-text"><b>{count} sections</b> · {hidden.length ? `${hidden.length} ${hidden.length === 1 ? 'thing' : 'things'} you can still add` : 'all set'}</span>
            <button type="button" className="sb-link-btn" onClick={() => onEditSection('hero')} aria-label="Edit sections">Edit</button>
          </li>
        </ul>

        <PhotoNeeds needs={needs} style={site.style.resolved} content={pageContent(site, trade)} onAdd={onEditSection} />

        {hidden.length > 0 && (
          <section aria-labelledby="hidden-h" className="bg-hidden">
            <h2 id="hidden-h" className="bg-h3">Hidden until you add them</h2>
            <ul>
              {hidden.map(item => {
                const section = sectionForItem(site, trade, item.id)
                return (
                  <li key={item.id}>
                    <span>{item.label}</span>
                    {section && <button type="button" className="sb-link-btn" onClick={() => onEditSection(section)} aria-label={`Add ${item.label}`}>Add</button>}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <div className="bg-after">
          {share && (
            <button type="button" className="sb-link-btn" aria-expanded={sharing} aria-controls={shareId} onClick={() => setSharing(s => !s)}>
              Share a preview link first
            </button>
          )}
          <button type="button" className="sb-text-btn bg-reset" onClick={onReset}>Start a new site</button>
        </div>
        {share && <div id={shareId} hidden={!sharing}>{share}</div>}
      </section>

      <GoLivePanel site={site} trade={trade} draft={draft} adminPublish={adminPublish} domain={domain} onBusinessChange={onBusinessChange} verify={verify} cancelled={cancelled} shop={shop} />
    </main>
  )
}
