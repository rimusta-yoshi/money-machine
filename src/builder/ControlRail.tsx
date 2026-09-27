import type { CSSProperties } from 'react'
import { SECTION_LABELS } from '../site/labels'
import { Icon } from '../components/ui/Icon'
import { SectionContentEditor } from './content/SectionContentEditor'
import type { SectionNavProps } from './sectionNav'

interface Props extends SectionNavProps {
  deviceLabel: 'Mobile' | 'Desktop'
}

/** Desktop side panel: progress, layout switcher and the active section's own content. */
export function ControlRail(props: Props) {
  const { site, trade, sections, activeIdx, layoutIdx, doneCount, allDone, deviceLabel } = props
  const active = sections[activeIdx]
  const nextIdx = Math.min(activeIdx + 1, sections.length - 1)
  const variant = active.variants[layoutIdx]
  const revisiting = !!site.selections[active.type]

  return (
    <div className="mm-stack-ctrl">
      <div className="sc-prog">
        <div className="sc-prog-top">
          <b>{doneCount}/{sections.length} sections set</b>
          <span>{allDone ? 'Ready to go live' : `Next: ${SECTION_LABELS[sections[nextIdx].type]}`}</span>
        </div>
        <div className="sc-track">
          <div className={`sc-fill${allDone ? ' full' : ''}`} style={{ width: `${(doneCount / sections.length) * 100}%` } as CSSProperties} />
        </div>
      </div>

      <div className="sc-now">
        <div className="sc-now-top">
          <div className="sc-eyebrow">{revisiting ? 'Revisiting' : 'Now building'}</div>
          <span className="sc-device">
            {deviceLabel === 'Mobile' ? <Icon.Phone size={11} /> : <Icon.Monitor size={11} />} {deviceLabel}
          </span>
        </div>
        <h2 className="sc-name">{SECTION_LABELS[active.type]}</h2>

        {active.variants.length > 1 ? (
          <div className="sc-arrows">
            <button type="button" className="mm-arrow" onClick={() => props.onCycleLayout(-1)} aria-label="Previous layout">‹</button>
            <div className="sc-vmeta">
              <div className="sc-vname">{variant.label}</div>
              <div className="sc-tip">Layout {layoutIdx + 1} of {active.variants.length}</div>
            </div>
            <button type="button" className="mm-arrow" onClick={() => props.onCycleLayout(1)} aria-label="Next layout">›</button>
          </div>
        ) : (
          <div className="sc-tip">One layout for this section</div>
        )}

        <div className="sc-content">
          <SectionContentEditor site={site} trade={trade} section={active.type} onContentChange={props.onContentChange} />
        </div>
      </div>

      {allDone ? (
        <button type="button" className="sc-launch" onClick={props.onFinish}>
          <Icon.Arrow size={16} /> Review and go live
        </button>
      ) : (
        <button type="button" className="sc-next" onClick={props.onNext}>
          Next · {SECTION_LABELS[sections[nextIdx].type]} <Icon.Arrow size={14} />
        </button>
      )}
      <div className="sc-hint">Click any section in the preview to go back to it.</div>
    </div>
  )
}
