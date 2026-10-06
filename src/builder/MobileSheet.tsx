import { useId, useState } from 'react'
import { SECTION_LABELS } from '../site/labels'
import { SectionContentEditor } from './content/SectionContentEditor'
import type { SectionNavProps } from './sectionNav'
import { NextButton, ProgressBlocks } from './build/BuildBits'
import { layoutNote } from './build/buildText'

interface Props extends SectionNavProps {
  /** The top bar's Preview button folds the sheet away to see the site. */
  folded: boolean
}

/** Phone bottom sheet: progress, layout arrows (or swipe the preview), content and next. */
export function MobileSheet(props: Props) {
  const { site, trade, sections, activeIdx, layout, folded } = props
  const bodyId = useId()
  const [open, setOpen] = useState(false)
  const active = sections[activeIdx]
  const sub = layout.count > 1 ? `${layout.label} · ${layout.index + 1} of ${layout.count} · swipe to change` : layoutNote(layout)

  return (
    <section aria-label="Build controls" className={`bd-sheet${folded ? ' folded' : ''}`}>
      {!folded && (
        <>
          <ProgressBlocks site={site} sections={sections} activeIdx={activeIdx} />
          <div className="bd-arrows">
            <button type="button" className="bd-arrow" onClick={() => props.onCycleLayout(-1)} aria-label="Previous layout" disabled={layout.count < 2}>‹</button>
            <div className="bd-layout">
              <h1 className="bd-sheet-name">{SECTION_LABELS[active.type]}</h1>
              <span aria-live="polite">{sub}</span>
            </div>
            <button type="button" className="bd-arrow" onClick={() => props.onCycleLayout(1)} aria-label="Next layout" disabled={layout.count < 2}>›</button>
          </div>
          {layout.needs && (
            <p className="bd-waiting">Example content. {layout.needs.replace(/ to show this\.$/, '')} to put this on your site; your layout is kept for it.</p>
          )}
          <div className="bd-sheet-row">
            {props.onNewOptions && layout.count > 0 && (
              <button type="button" className="bd-different" onClick={props.onNewOptions} disabled={layout.loading}>
                {layout.loading ? 'Making…' : 'Different ones'}
              </button>
            )}
            <button type="button" className="sb-line-btn" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(o => !o)}>
              {open ? 'Hide content' : 'Your content'}
            </button>
          </div>
          <div id={bodyId} className="bd-sheet-body" hidden={!open}>
            <SectionContentEditor site={site} trade={trade} section={active.type} onContentChange={props.onContentChange} onBusinessChange={props.onBusinessChange} />
            <button type="button" className="sb-link-btn" onClick={props.onChangeLook}>Change look</button>
          </div>
        </>
      )}
      <NextButton {...props} />
    </section>
  )
}
