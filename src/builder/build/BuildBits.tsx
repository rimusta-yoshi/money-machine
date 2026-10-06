import { SECTION_LABELS } from '../../site/labels'
import { isPicked } from '../../site/sections'
import type { SectionNavProps } from '../sectionNav'

/** One block per section: done in lawn, the current one in pipe blue, the rest empty. */
export function ProgressBlocks({ site, sections, activeIdx }: Pick<SectionNavProps, 'site' | 'sections' | 'activeIdx'>) {
  return (
    <div className="bd-blocks" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
      {sections.map((s, i) => (
        <span key={s.type} className={i === activeIdx ? 'now' : isPicked(site, s.type) ? 'done' : undefined} />
      ))}
    </div>
  )
}

/** The brick button: the next section, or on to go live once every section is settled. */
export function NextButton({ sections, nextIdx, allDone, layout, onNext, onFinish, className = '' }: Pick<SectionNavProps, 'sections' | 'nextIdx' | 'allDone' | 'layout' | 'onNext' | 'onFinish'> & { className?: string }) {
  return (
    <button type="button" className={`sb-main-btn bd-next ${className}`} onClick={allDone ? onFinish : onNext} disabled={layout.loading}>
      {allDone ? 'Next: go live' : `Next: ${SECTION_LABELS[sections[nextIdx].type].toLowerCase()}`}
    </button>
  )
}

/** Dots under the arrows, the current one wide. */
export function LayoutDots({ index, count }: { index: number; count: number }) {
  if (count < 2) return null
  return (
    <div className="bd-dots" aria-hidden="true">
      {Array.from({ length: count }, (_, k) => <span key={k} className={k === index ? 'on' : undefined} />)}
    </div>
  )
}
