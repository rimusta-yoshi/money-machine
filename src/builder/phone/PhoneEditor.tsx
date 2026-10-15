import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { SECTION_LABELS } from '../../site/labels'
import { SectionContentEditor } from '../content/SectionContentEditor'
import type { SectionNavProps } from '../sectionNav'
import type { PreviewSize } from './phoneFlow'

interface Props extends SectionNavProps {
  size: PreviewSize
  onSize: (size: PreviewSize) => void
  /** Done: close the fields and move on. */
  onDone: () => void
  /** Escape: back to the bar on this section. */
  onClose: () => void
  /** Tells the canvas which part of the section the focused field shows (a CSS selector, or null). */
  onFieldFocus: (selector: string | null) => void
  /** "Email me a link to finish on my computer", when saving to the server is on. */
  resume?: ReactNode
  /** The visible screen's height: it shrinks when the keyboard opens. */
  viewportHeight?: number
}

/**
 * "Edit <section>" on a phone: just that section's fields, under the section itself (kept in
 * view above, updating as you type). Done moves on to the next section.
 */
export function PhoneEditor(props: Props) {
  const { site, trade, sections, activeIdx, size } = props
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const name = SECTION_LABELS[sections[activeIdx].type]

  // Opening moves focus into the fields' panel, so keyboard and screen-reader users land here.
  useEffect(() => { headingRef.current?.focus() }, [])
  // The keyboard opened (or closed): keep the field being typed in on screen.
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const field = document.activeElement
    if (field instanceof HTMLElement && bodyRef.current?.contains(field)) field.scrollIntoView({ block: 'nearest' })
  }, [props.viewportHeight])

  return (
    <section
      aria-labelledby={headingId}
      className="bd-phone-edit"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); props.onClose() } }}
      onFocus={e => props.onFieldFocus((e.target as Element).closest?.('[data-preview]')?.getAttribute('data-preview') ?? null)}
    >
      <div className="bd-phone-edit-head">
        <h1 id={headingId} ref={headingRef} tabIndex={-1} className="bd-phone-edit-title">Your {name.toLowerCase()}</h1>
        <div role="group" aria-label="Preview size" className="bt-size bd-phone-size">
          <button type="button" aria-pressed={size === 'phone'} onClick={() => props.onSize('phone')}>Phone</button>
          <button type="button" aria-pressed={size === 'computer'} onClick={() => props.onSize('computer')}>Computer</button>
        </div>
      </div>
      <div className="bd-phone-edit-body" ref={bodyRef}>
        <SectionContentEditor site={site} trade={trade} section={sections[activeIdx].type} onContentChange={props.onContentChange} onBusinessChange={props.onBusinessChange} />
        <p className="mm-note">Watch your site update above as you type.</p>
        <button type="button" className="sb-link-btn bd-phone-look" onClick={props.onChangeLook}>Change colours and style</button>
        {props.resume}
      </div>
      <div className="bd-phone-edit-foot">
        {/* aria-disabled, not disabled: focus stays on the button while the layouts catch up. */}
        <button type="button" className="sb-main-btn bd-next" onClick={() => { if (!props.layout.loading) props.onDone() }} aria-disabled={props.layout.loading || undefined}>
          {props.layout.loading ? 'Updating layouts…' : 'Done'}
        </button>
      </div>
    </section>
  )
}
