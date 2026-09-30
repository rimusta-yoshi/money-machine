import { useId } from 'react'
import type { TradeConfig } from '../../types'
import type { ChecklistId } from '../../site/checklist'
import type { Site, SiteContent } from '../../site/schema'
import { ListEditor } from './ListEditor'
import { HoursEditor } from './HoursEditor'
import { ReviewsEditor } from './ReviewsEditor'
import { RatingEditor } from './RatingEditor'
import { GalleryEditor, PhotoEditor } from './PhotoEditor'
import { defaultAlt } from '../../site/photoAlt'
import { LIMITS } from '../../site/limits'
import { THEMES } from '../../gen'
import { CERTS_NOTE_SUGGESTION } from '../../site/suggestions'
import { SuggestedLinesEditor, SuggestedNoteEditor } from './SuggestedLinesEditor'

const MAX_GALLERY = 12

interface Props {
  id: ChecklistId
  site: Site
  trade: TradeConfig
  onContentChange: (patch: Partial<SiteContent>) => void
}

export function ChecklistItemEditor({ id, site, trade, onContentChange }: Props) {
  const c = site.content
  switch (id) {
    case 'badges':
      return (
        <ListEditor
          label="Add a credential or guarantee"
          items={c.badges}
          onChange={badges => onContentChange({ badges })}
          placeholder="e.g. Gas Safe Registered"
          max={8}
          maxLength={LIMITS.badge}
          suggestions={trade.trustSignals}
        />
      )
    case 'whyUs':
      return (
        <SuggestedLinesEditor
          lines={c.whyUs ?? null}
          suggestions={THEMES[site.style.theme].voice.why}
          onChange={whyUs => onContentChange({ whyUs })}
          max={6}
        />
      )
    case 'certsNote':
      return (
        <SuggestedNoteEditor
          note={c.certsNote ?? null}
          suggestion={CERTS_NOTE_SUGGESTION}
          onChange={certsNote => onContentChange({ certsNote })}
          max={LIMITS.certsNote}
        />
      )
    case 'areas':
      return (
        <ListEditor
          label="Add a town or area"
          items={c.areas}
          onChange={areas => onContentChange({ areas })}
          placeholder="e.g. Headingley"
          max={16}
          maxLength={LIMITS.area}
        />
      )
    case 'hours':
      return <HoursEditor hours={c.hours} onChange={hours => onContentChange({ hours })} />
    case 'emergency':
      return <EmergencyEditor value={c.emergency} onChange={emergency => onContentChange({ emergency })} />
    case 'jobsDone':
      return <JobsDoneEditor value={c.jobsDone} onChange={jobsDone => onContentChange({ jobsDone })} />
    case 'rating':
      return <RatingEditor rating={c.rating} onChange={rating => onContentChange({ rating })} />
    case 'reviews':
      return <ReviewsEditor reviews={c.reviews} onChange={reviews => onContentChange({ reviews })} />
    case 'photos.hero':
      return (
        <PhotoEditor
          photo={c.photos.hero}
          defaultAlt={defaultAlt('hero', site, trade)}
          onChange={hero => onContentChange({ photos: { ...c.photos, hero } })}
        />
      )
    case 'photos.about':
      return (
        <PhotoEditor
          photo={c.photos.about}
          defaultAlt={defaultAlt('about', site, trade)}
          onChange={about => onContentChange({ photos: { ...c.photos, about } })}
        />
      )
    case 'photos.gallery':
      return (
        <GalleryEditor
          photos={c.photos.gallery}
          max={MAX_GALLERY}
          defaultAlt={i => defaultAlt('gallery', site, trade, i)}
          onChange={gallery => onContentChange({ photos: { ...c.photos, gallery } })}
        />
      )
  }
}

function EmergencyEditor({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  const name = useId()
  return (
    // The surrounding group is labelled with the question, so no legend is repeated here.
    <div className="mm-yesno">
      {[true, false].map(v => (
        <label key={String(v)} className={`mm-yesno-opt${value === v ? ' on' : ''}`}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
          {v ? 'Yes' : 'No'}
        </label>
      ))}
    </div>
  )
}

function JobsDoneEditor({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const id = useId()
  return (
    <div className="mm-fld" style={{ maxWidth: 220 }}>
      <label htmlFor={id}>Jobs done (roughly)</label>
      <input
        id={id}
        value={value ?? ''}
        maxLength={LIMITS.jobsDone}
        placeholder="e.g. 500+"
        onChange={e => onChange(e.target.value.trim() ? e.target.value : null)}
      />
    </div>
  )
}
