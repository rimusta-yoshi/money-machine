import { forwardRef, useId } from 'react'
import { SECTION_LABELS } from '../../site/labels'
import type { SectionNavProps } from '../sectionNav'
import { NextButton } from '../build/BuildBits'
import { barLine } from './phoneFlow'

interface Props extends SectionNavProps {
  onEdit: () => void
}

/**
 * The phone builder's slim bar: swipe (or ‹ ›) through layouts, "Edit <section>" for its
 * fields, and the brick Next button. Whatever layout is showing is the one kept.
 */
export const PhoneBar = forwardRef<HTMLButtonElement, Props>(function PhoneBar(props, editRef) {
  const { sections, activeIdx, layout } = props
  const lineId = useId()
  const name = SECTION_LABELS[sections[activeIdx].type]
  const canCycle = layout.count > 1
  return (
    <section aria-label="Build controls" className="bd-bar">
      <h1 className="sb-sr-only">Build: {name}</h1>
      <div className="bd-bar-row">
        <button type="button" className="bd-arrow" onClick={() => props.onCycleLayout(-1)} aria-label="Previous layout" disabled={!canCycle}>‹</button>
        <button type="button" ref={editRef} className="bd-bar-edit" onClick={props.onEdit} aria-describedby={lineId}>
          Edit {name.toLowerCase()}
        </button>
        <button type="button" className="bd-arrow" onClick={() => props.onCycleLayout(1)} aria-label="Next layout" disabled={!canCycle}>›</button>
      </div>
      <div className="bd-bar-meta">
        <p id={lineId} className="bd-bar-line" aria-live="polite">{barLine(name, layout)}</p>
        {props.onNewOptions && layout.count > 0 && (
          <button type="button" className="bd-bar-more" onClick={props.onNewOptions} disabled={layout.loading} aria-label="Show me different layouts">
            {layout.loading ? 'Making…' : 'New ones'}
          </button>
        )}
      </div>
      <NextButton {...props} />
    </section>
  )
})
