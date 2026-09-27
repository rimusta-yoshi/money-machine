import { useId, useState } from 'react'
import type { CSSProperties } from 'react'
import { SECTION_LABELS } from '../site/labels'
import { sectionChecklist } from '../site/checklist'
import { Icon } from '../components/ui/Icon'
import { SectionContentEditor } from './content/SectionContentEditor'
import type { SectionNavProps } from './sectionNav'

/** Phone bottom sheet: layout switcher plus the active section's content. Swipe the canvas to change layout. */
export function MobileSheet(props: SectionNavProps) {
  const { site, trade, sections, activeIdx, layoutIdx, doneCount, allDone } = props
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
        <button type="button" className="mm-ctrl-arr" onClick={() => props.onCycleLayout(-1)} aria-label="Previous layout" disabled={active.variants.length < 2}>‹</button>
        <div className="mm-ctrl-center">
          <h2 className="mm-ctrl-section-name">{SECTION_LABELS[active.type]}</h2>
          <div className="mm-sheet-sub">
            {active.variants.length > 1 ? `Layout ${layoutIdx + 1} of ${active.variants.length} · swipe to change` : 'One layout'}
          </div>
        </div>
        <button type="button" className="mm-ctrl-arr" onClick={() => props.onCycleLayout(1)} aria-label="Next layout" disabled={active.variants.length < 2}>›</button>
      </div>

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

      {allDone ? (
        <button type="button" className="mm-ctrl-launch" onClick={props.onFinish}>
          <Icon.Arrow size={16} /> Review and go live
        </button>
      ) : (
        <button type="button" className="mm-ctrl-next" onClick={props.onNext}>
          Next · {SECTION_LABELS[sections[nextIdx].type]} <Icon.Arrow size={14} />
        </button>
      )}
    </div>
  )
}
