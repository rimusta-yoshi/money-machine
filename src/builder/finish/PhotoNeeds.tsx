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
    <section className="mm-photo-needs" aria-labelledby="mm-photo-needs-title">
      <h2 id="mm-photo-needs-title" className="mm-photo-needs-title">
        Photos win jobs <span className="mm-photo-needs-tag">Strongly recommended</span>
      </h2>
      <ul>
        {needs.map(need => {
          const label = SECTION_LABELS[need.section]
          return (
            <li key={need.section} className="mm-photo-need">
              <div className="mm-photo-need-text">
                <p>
                  Your {label.toLowerCase()} layout needs {WANTS[need.slot]}. Add one, or {need.swapped ? 'we’ll use this layout instead' : 'it goes live without it, like this'}.
                </p>
                <button type="button" className="mm-golive-add" onClick={() => onAdd(need.section)} aria-label={`Add ${WANTS[need.slot]} for the ${label.toLowerCase()} section`}>
                  Add a photo
                </button>
              </div>
              <div className="mm-photo-need-thumb" aria-hidden="true" inert>
                <div className="mm-photo-need-scale">
                  <GeneratedSection section={need.live} style={style} content={content} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
