import type { CSSProperties } from 'react'
import { SECTION_LABELS } from '../site/labels'
import { isPicked } from '../site/sections'
import { Icon } from '../components/ui/Icon'
import { SectionContentEditor } from './content/SectionContentEditor'
import type { SectionNavProps } from './sectionNav'
import { SiteStyleCard } from './SiteStyleCard'

interface Props extends SectionNavProps {
  deviceLabel: 'Mobile' | 'Desktop'
}

/** Desktop side panel: progress, layout switcher and the active section's own content. */
export function ControlRail(props: Props) {
  const { site, trade, sections, activeIdx, layout, doneCount, allDone, deviceLabel } = props
  const active = sections[activeIdx]
  const nextIdx = Math.min(activeIdx + 1, sections.length - 1)
  const revisiting = isPicked(site, active.type)
  const noun = props.onNewOptions ? 'Option' : 'Layout'

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

      <SiteStyleCard {...props.siteStyle} />

      <div className="sc-now">
        <div className="sc-now-top">
          <div className="sc-eyebrow">{revisiting ? 'Revisiting' : 'Now building'}</div>
          <span className="sc-device">
            {deviceLabel === 'Mobile' ? <Icon.Phone size={11} /> : <Icon.Monitor size={11} />} {deviceLabel}
          </span>
        </div>
        <h2 className="sc-name">{SECTION_LABELS[active.type]}</h2>

        {layout.count > 1 ? (
          <div className="sc-arrows">
            <button type="button" className="mm-arrow" onClick={() => props.onCycleLayout(-1)} aria-label={`Previous ${noun.toLowerCase()}`}>‹</button>
            <div className="sc-vmeta" aria-live="polite">
              <div className="sc-vname">{layout.label}</div>
              <div className="sc-tip">{noun} {layout.index + 1} of {layout.count}</div>
            </div>
            <button type="button" className="mm-arrow" onClick={() => props.onCycleLayout(1)} aria-label={`Next ${noun.toLowerCase()}`}>›</button>
          </div>
        ) : layout.needs ? (
          <div className="sc-waiting" aria-live="polite">
            <b>Nothing to choose yet.</b> {layout.needs.replace(/ to show this\.$/, '')} below, and layouts for this section appear here.
          </div>
        ) : (
          <div className="sc-tip" aria-live="polite">
            {layout.loading ? 'Generating layouts…' : layout.count === 1 ? `One ${noun.toLowerCase()} for this section` : 'No layouts fit this content yet'}
          </div>
        )}
        {props.onNewOptions && layout.count > 0 && (
          <button type="button" className="sc-reroll" onClick={props.onNewOptions} disabled={layout.loading}>
            {layout.loading ? 'Generating…' : 'New options'}
          </button>
        )}

        <div className="sc-content">
          <SectionContentEditor site={site} trade={trade} section={active.type} onContentChange={props.onContentChange} />
        </div>
      </div>

      {allDone ? (
        <button type="button" className="sc-launch" onClick={props.onFinish} disabled={layout.loading}>
          <Icon.Arrow size={16} /> Review and go live
        </button>
      ) : (
        <button type="button" className="sc-next" onClick={props.onNext} disabled={layout.loading}>
          Next · {SECTION_LABELS[sections[nextIdx].type]} <Icon.Arrow size={14} />
        </button>
      )}
      <div className="sc-hint">Click any section in the preview to go back to it.</div>
    </div>
  )
}
