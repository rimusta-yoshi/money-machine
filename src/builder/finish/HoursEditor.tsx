import { useId } from 'react'
import type { OpeningHours } from '../../site/schema'

const TYPICAL: OpeningHours[] = [
  { day: 'Mon – Fri', time: '8:00 – 17:00' },
  { day: 'Saturday', time: '9:00 – 13:00' },
  { day: 'Sunday', time: 'Closed' },
]

interface Props {
  hours: OpeningHours[] | null
  onChange: (hours: OpeningHours[] | null) => void
}

export function HoursEditor({ hours, onChange }: Props) {
  const id = useId()
  const rows = hours ?? []

  const update = (i: number, patch: Partial<OpeningHours>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => {
    const next = rows.filter((_, j) => j !== i)
    onChange(next.length ? next : null)
  }

  if (rows.length === 0) {
    return (
      <button type="button" className="mm-add-btn" onClick={() => onChange(TYPICAL)}>
        Start with typical hours, then edit
      </button>
    )
  }

  return (
    <div className="mm-hours-editor">
      {rows.map((row, i) => (
        <fieldset key={i} className="mm-hours-row">
          <legend className="mm-sr-only">Opening hours row {i + 1}</legend>
          <div className="mm-fld">
            <label htmlFor={`${id}-d${i}`}>Days</label>
            <input id={`${id}-d${i}`} value={row.day} maxLength={30} onChange={e => update(i, { day: e.target.value })} />
          </div>
          <div className="mm-fld">
            <label htmlFor={`${id}-t${i}`}>Hours</label>
            <input id={`${id}-t${i}`} value={row.time} maxLength={40} onChange={e => update(i, { time: e.target.value })} />
          </div>
          <button type="button" className="mm-chip-x" onClick={() => remove(i)} aria-label={`Remove ${row.day || `row ${i + 1}`}`}>×</button>
        </fieldset>
      ))}
      {rows.length < 8 && (
        <button type="button" className="mm-add-btn" onClick={() => onChange([...rows, { day: '', time: '' }])}>Add a row</button>
      )}
    </div>
  )
}
