import { useId } from 'react'
import type { TradeConfig } from '../../types'
import type { ChecklistId } from '../../site/checklist'
import type { Site, SiteContent } from '../../site/schema'
import { ListEditor } from './ListEditor'
import { HoursEditor } from './HoursEditor'
import { ReviewsEditor } from './ReviewsEditor'
import { RatingEditor } from './RatingEditor'

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
          maxLength={60}
          suggestions={trade.trustSignals}
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
          maxLength={60}
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
    case 'photos.about':
    case 'photos.gallery':
      return <p className="mm-note">Photo uploads arrive with publishing. Until then, this part of your site stays hidden.</p>
  }
}

function EmergencyEditor({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  const name = useId()
  return (
    <fieldset className="mm-yesno">
      <legend className="mm-sr-only">Do you offer emergency call-outs?</legend>
      {[true, false].map(v => (
        <label key={String(v)} className={`mm-yesno-opt${value === v ? ' on' : ''}`}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
          {v ? 'Yes' : 'No'}
        </label>
      ))}
    </fieldset>
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
        maxLength={20}
        placeholder="e.g. 500+"
        onChange={e => onChange(e.target.value.trim() ? e.target.value : null)}
      />
    </div>
  )
}
