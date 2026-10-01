import { useId, useState } from 'react'
import type { CSSProperties } from 'react'
import { SECTION_LABELS } from '../site/labels'
import { sectionChecklist } from '../site/checklist'
import { Icon } from '../components/ui/Icon'
import { SectionContentEditor } from './content/SectionContentEditor'
import type { SectionNavProps } from './sectionNav'
import { SiteStyleCard } from './SiteStyleCard'

/** Phone bottom sheet: layout switcher plus the active section's content. Swipe the canvas to change layout. */
export function MobileSheet(props: SectionNavProps) {
  const { site, trade, sections, activeIdx, layout, doneCount, allDone } = props
  const bodyId = useId()
  const [open, setOpen] = useState(true)
  const active = sections[activeIdx]
  const nextIdx = Math.min(activeIdx + 1, sections.length - 1)
  const hasContent = sectionChecklist(site, trade, active.type).length > 0

  return (
    <div className="mm-ctrl-bar mm-sheet">
      <div className="mm-ctrl-bar-top">
        <div className="mm-ctrl-prog-track">
          <div className="mm-ctrl-prog-fill" style={{ width: `${(doneCount / sections.length) * 100}%` } as CSSProperties} />
        </div>
        <span className="mm-ctrl-prog-label">{doneCount}/{sections.length}</span>
      </div>

      <div className="mm-ctrl-bar-mid">
        <button type="button" className="mm-ctrl-arr" onClick={() => props.onCycleLayout(-1)} aria-label="Previous layout" disabled={layout.count < 2}>‹</button>
        <div className="mm-ctrl-center">
          <h2 className="mm-ctrl-section-name">{SECTION_LABELS[active.type]}</h2>
          <div className="mm-sheet-sub" aria-live="polite">
            {layout.count > 1
              ? `${layout.label} · ${layout.index + 1} of ${layout.count} · swipe to change`
              : layout.loading ? 'Generating layouts…' : layout.count === 1 ? 'One layout'
                : layout.needs ? `Nothing to choose yet. ${layout.needs.replace(/ to show this\.$/, '')} and layouts appear.` : 'No layouts fit this content yet'}
          </div>
        </div>
        <button type="button" className="mm-ctrl-arr" onClick={() => props.onCycleLayout(1)} aria-label="Next layout" disabled={layout.count < 2}>›</button>
      </div>
      {props.onNewOptions && layout.count > 0 && (
        <button type="button" className="mm-sheet-reroll" onClick={props.onNewOptions} disabled={layout.loading}>
          {layout.loading ? 'Generating…' : 'New options'}
        </button>
      )}

      {hasContent && (
        <>
          <button type="button" className="mm-sheet-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(o => !o)}>
            {open ? 'Hide details' : 'Fill in your details'}
          </button>
          <div id={bodyId} className="mm-sheet-body" hidden={!open}>
            <SectionContentEditor site={site} trade={trade} section={active.type} onContentChange={props.onContentChange} />
          </div>
        </>
      )}

      <details className="mm-sheet-style">
        <summary>Site style</summary>
        <SiteStyleCard {...props.siteStyle} />
      </details>

      {allDone ? (
        <button type="button" className="mm-ctrl-launch" onClick={props.onFinish} disabled={layout.loading}>
          <Icon.Arrow size={16} /> Review and go live
        </button>
      ) : (
        <button type="button" className="mm-ctrl-next" onClick={props.onNext} disabled={layout.loading}>
          Next · {SECTION_LABELS[sections[nextIdx].type]} <Icon.Arrow size={14} />
        </button>
      )}
    </div>
  )
}
