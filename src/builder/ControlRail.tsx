import { SECTION_LABELS } from '../site/labels'
import { SectionContentEditor } from './content/SectionContentEditor'
import type { SectionNavProps } from './sectionNav'
import { LayoutDots, NextButton, ProgressBlocks } from './build/BuildBits'
import { layoutNote, sectionCount } from './build/buildText'

/** Desktop side panel: progress, the layout switcher, the section's own content, and next. */
export function ControlRail(props: SectionNavProps) {
  const { site, trade, sections, activeIdx, layout } = props
  const active = sections[activeIdx]

  return (
    <aside aria-label="Build controls" className="bd-rail">
      <div className="bd-rail-top">
        <div className="bd-rail-meta">
          <span>{sectionCount(activeIdx, sections.length)}</span>
          <button type="button" className="sb-link-btn" onClick={props.onChangeLook}>Change look</button>
        </div>
        <ProgressBlocks site={site} sections={sections} activeIdx={activeIdx} />
      </div>
      <h1 className="bs-h1 bd-name">{SECTION_LABELS[active.type]}</h1>

      <div className="bd-switcher">
        {layout.count > 1 ? (
          <div className="bd-arrows">
            <button type="button" className="bd-arrow" onClick={() => props.onCycleLayout(-1)} aria-label="Previous layout">‹</button>
            <div className="bd-layout" aria-live="polite">
              <b>{layout.label}</b>
              <span>Layout {layout.index + 1} of {layout.count}</span>
            </div>
            <button type="button" className="bd-arrow" onClick={() => props.onCycleLayout(1)} aria-label="Next layout">›</button>
          </div>
        ) : (
          <p className="bd-layout bd-layout--alone" aria-live="polite">{layoutNote(layout)}</p>
        )}
        <LayoutDots index={layout.index} count={layout.count} />
        {props.onNewOptions && layout.count > 0 && (
          <button type="button" className="bd-different" onClick={props.onNewOptions} disabled={layout.loading}>
            {layout.loading ? 'Making new ones…' : 'Show me different ones'}
          </button>
        )}
      </div>
      {layout.needs && (
        <p className="bd-waiting">
          <b>Showing example content.</b> {layout.needs.replace(/ to show this\.$/, '')} below to put this section on your site. The layout you pick now is kept for it.
        </p>
      )}

      <div className="bd-content">
        <h2 className="bd-content-title">Your content</h2>
        <SectionContentEditor site={site} trade={trade} section={active.type} onContentChange={props.onContentChange} onBusinessChange={props.onBusinessChange} />
      </div>

      <div className="bs-foot bd-foot">
        <button type="button" className="sb-text-btn" onClick={props.onChangeLook}>← Your look</button>
        <NextButton {...props} />
      </div>
    </aside>
  )
}
