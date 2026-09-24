import { useId, useState } from 'react'

interface Props {
  label: string
  items: string[] | null
  onChange: (items: string[] | null) => void
  placeholder: string
  max: number
  maxLength: number
  /** One-tap additions, e.g. the trade's typical credentials. */
  suggestions?: string[]
}

/** Editable list of short text items. An empty list is reported as null (= not provided). */
export function ListEditor({ label, items, onChange, placeholder, max, maxLength, suggestions = [] }: Props) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const list = items ?? []
  const full = list.length >= max
  const has = (value: string) => list.some(i => i.toLowerCase() === value.toLowerCase())

  const add = (raw: string) => {
    const value = raw.trim()
    if (!value || full || has(value)) return
    onChange([...list, value])
    setDraft('')
  }
  const remove = (value: string) => {
    const next = list.filter(i => i !== value)
    onChange(next.length ? next : null)
  }
  const unused = suggestions.filter(s => !has(s))

  return (
    <div className="mm-list-editor">
      {list.length > 0 && (
        <ul className="mm-chips">
          {list.map(item => (
            <li key={item} className="mm-chip">
              {item}
              <button type="button" className="mm-chip-x" onClick={() => remove(item)} aria-label={`Remove ${item}`}>×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="mm-fld">
        <label htmlFor={id}>{label}</label>
        <div className="mm-add-row">
          <input
            id={id}
            value={draft}
            maxLength={maxLength}
            placeholder={placeholder}
            disabled={full}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(draft) } }}
          />
          <button type="button" className="mm-add-btn" onClick={() => add(draft)} disabled={full}>Add</button>
        </div>
      </div>
      {unused.length > 0 && !full && (
        <div className="mm-suggest">
          <span className="mm-suggest-label">Quick add:</span>
          {unused.map(s => (
            <button type="button" key={s} className="mm-suggest-chip" onClick={() => add(s)} aria-label={`Add ${s}`}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  )
}
