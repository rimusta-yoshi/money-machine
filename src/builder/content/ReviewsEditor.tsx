import { useId, useState } from 'react'
import type { Review } from '../../site/schema'

const EMPTY: Review = { author: '', location: '', text: '', rating: 5 }

interface Props {
  reviews: Review[] | null
  onChange: (reviews: Review[] | null) => void
}

export function ReviewsEditor({ reviews, onChange }: Props) {
  const id = useId()
  const [draft, setDraft] = useState<Review>(EMPTY)
  const list = reviews ?? []
  const canAdd = draft.author.trim() !== '' && draft.text.trim() !== '' && list.length < 12

  const add = () => {
    if (!canAdd) return
    onChange([...list, { ...draft, author: draft.author.trim(), location: draft.location.trim(), text: draft.text.trim() }])
    setDraft(EMPTY)
  }
  const remove = (i: number) => {
    const next = list.filter((_, j) => j !== i)
    onChange(next.length ? next : null)
  }

  return (
    <div className="mm-reviews-editor">
      {list.length > 0 && (
        <ul className="mm-review-list">
          {list.map((r, i) => (
            <li key={i} className="mm-review-item">
              <span><b>{r.author}</b> · {r.rating}/5 — {r.text}</span>
              <button type="button" className="mm-chip-x" onClick={() => remove(i)} aria-label={`Remove review from ${r.author}`}>×</button>
            </li>
          ))}
        </ul>
      )}
      <fieldset className="mm-review-form">
        <legend>Add a review from a real customer</legend>
        <div className="mm-fld-2">
          <div className="mm-fld">
            <label htmlFor={`${id}-a`}>Their name</label>
            <input id={`${id}-a`} value={draft.author} maxLength={60} placeholder="Sam P." onChange={e => setDraft({ ...draft, author: e.target.value })} />
          </div>
          <div className="mm-fld">
            <label htmlFor={`${id}-l`}>Where they live <span className="sublab">optional</span></label>
            <input id={`${id}-l`} value={draft.location} maxLength={60} placeholder="Headingley" onChange={e => setDraft({ ...draft, location: e.target.value })} />
          </div>
        </div>
        <div className="mm-fld">
          <label htmlFor={`${id}-t`}>What they said</label>
          <textarea id={`${id}-t`} value={draft.text} maxLength={400} onChange={e => setDraft({ ...draft, text: e.target.value })} />
        </div>
        <div className="mm-fld" style={{ maxWidth: 160 }}>
          <label htmlFor={`${id}-r`}>Stars</label>
          <select id={`${id}-r`} value={draft.rating} onChange={e => setDraft({ ...draft, rating: Number(e.target.value) })}>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} out of 5</option>)}
          </select>
        </div>
        <button type="button" className="mm-add-btn" onClick={add} disabled={!canAdd}>Add review</button>
      </fieldset>
    </div>
  )
}
