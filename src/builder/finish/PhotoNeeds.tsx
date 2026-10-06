import type { SectionType } from '../../types'
import type { PageContent, SiteStyle } from '../../gen'
import type { PhotoNeed, PhotoSlot } from '../../site/photoNeeds'
import { SECTION_LABELS } from '../../site/labels'
import { GeneratedSection } from '../../components/sections/GeneratedSection'

const WANTS: Record<PhotoSlot, string> = {
  hero: 'a photo',
  about: 'a photo of you, your team or your van',
  gallery: 'photos of your work',
}

interface Props {
  needs: readonly PhotoNeed[]
  style: SiteStyle
  content: PageContent
  onAdd: (section: SectionType) => void
}

/**
 * Layouts the customer picked that show a photo they haven't added. Strongly recommended,
 * never blocking: each says what goes live meanwhile, with a small preview of it.
 */
export function PhotoNeeds({ needs, style, content, onAdd }: Props) {
  if (needs.length === 0) return null
  return (
    <ul className="bg-list bg-needs" aria-label="Photos worth adding">
      {needs.map(need => {
        const label = SECTION_LABELS[need.section].toLowerCase()
        return (
          <li key={need.section} className="bg-row bg-need">
            <span className="bg-bang" aria-hidden="true">!</span>
            <span className="bg-need-text">
              <b>Photos win jobs · <span>Strongly recommended</span></b>
              <span>Your {label} layout needs {WANTS[need.slot]}. Add one, or {need.swapped ? 'we’ll use this layout instead' : 'it goes live without it, like this'}.</span>
            </span>
            <span className="bg-need-thumb" aria-hidden="true" inert>
              <span className="bg-need-scale">
                <GeneratedSection section={need.live} style={style} content={content} />
              </span>
            </span>
            <button type="button" className="sb-line-btn" onClick={() => onAdd(need.section)} aria-label={`Add ${WANTS[need.slot]} for the ${label} section`}>
              Add a photo
            </button>
          </li>
        )
      })}
    </ul>
  )
}
