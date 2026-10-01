import { useId, useState } from 'react'
import { LIMITS } from '../../site/limits'
import { CharCount } from './CharCount'
import { counted } from './counted'

export interface Line { title: string; text: string }

interface Props {
  /** The lines the customer has ticked or written. Only these are published. */
  lines: Line[] | null
  /** The theme's suggested lines, offered to tick. */
  suggestions: readonly (readonly [string, string])[]
  onChange: (lines: Line[] | null) => void
  max: number
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Suggested lines the customer ticks or edits. Nothing appears on the site until it's
 * ticked, edited or written; an empty choice is reported as null (= not provided).
 */
export function SuggestedLinesEditor({ lines, suggestions, onChange, max }: Props) {
  const chosen = lines ?? []
  const full = chosen.length >= max
  const offered = suggestions.filter(([title]) => !chosen.some(l => same(l.title, title)))
  const set = (next: Line[]) => onChange(next.length ? next : null)

  return (
    <div className="mm-lines">
      {chosen.length > 0 && (
        <ul className="mm-lines-list" aria-label="On your site">
          {chosen.map((line, i) => (
            <ChosenLine
              key={i}
              line={line}
              onChange={next => set(chosen.map((l, j) => (j === i ? next : l)))}
              onRemove={() => set(chosen.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
      )}
      {offered.length > 0 && (
        <fieldset className="mm-lines-suggest" disabled={full}>
          <legend>Suggestions: tick the ones that are true for you</legend>
          {offered.map(([title, text]) => (
            <label key={title} className="mm-line-option">
              <input type="checkbox" checked={false} onChange={() => set([...chosen, { title, text }])} />
              <span><b>{title}</b> {text}</span>
            </label>
          ))}
        </fieldset>
      )}
      {!full && <OwnLine onAdd={line => set([...chosen, line])} />}
    </div>
  )
}

function ChosenLine({ line, onChange, onRemove }: { line: Line; onChange: (l: Line) => void; onRemove: () => void }) {
  const id = useId()
  const [editing, setEditing] = useState(false)
  return (
    <li className="mm-line">
      <label className="mm-line-option">
        <input type="checkbox" checked onChange={onRemove} aria-describedby={`${id}-hint`} />
        <span><b>{line.title}</b> {line.text}</span>
      </label>
      <span id={`${id}-hint`} className="mm-sr-only">Untick to remove it from your site</span>
      <button type="button" className="mm-line-edit" aria-expanded={editing} onClick={() => setEditing(e => !e)}>
        {editing ? 'Done' : 'Edit'}
      </button>
      {editing && (
        <div className="mm-line-fields">
          <div className="mm-fld">
            <label htmlFor={`${id}-t`}>Heading</label>
            <input id={`${id}-t`} value={line.title} {...counted(`${id}-tc`, line.title, LIMITS.whyTitle)}
              onChange={e => e.target.value.trim() && onChange({ ...line, title: e.target.value })} />
            <CharCount id={`${id}-tc`} value={line.title} max={LIMITS.whyTitle} />
          </div>
          <div className="mm-fld">
            <label htmlFor={`${id}-x`}>A sentence about it</label>
            <textarea id={`${id}-x`} rows={2} value={line.text} {...counted(`${id}-xc`, line.text, LIMITS.whyText)}
              onChange={e => onChange({ ...line, text: e.target.value })} />
            <CharCount id={`${id}-xc`} value={line.text} max={LIMITS.whyText} />
          </div>
        </div>
      )}
    </li>
  )
}

function OwnLine({ onAdd }: { onAdd: (l: Line) => void }) {
  const id = useId()
  const [title, setTitle] = useState('')
  const add = () => {
    if (!title.trim()) return
    onAdd({ title: title.trim().slice(0, LIMITS.whyTitle), text: '' })
    setTitle('')
  }
  return (
    <div className="mm-fld">
      <label htmlFor={id}>Or write your own</label>
      <div className="mm-add-row">
        <input id={id} value={title} maxLength={LIMITS.whyTitle} placeholder="e.g. We answer the phone ourselves"
          onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <button type="button" className="mm-add-btn" onClick={add}>Add</button>
      </div>
    </div>
  )
}

interface NoteProps {
  note: string | null
  suggestion: string
  onChange: (note: string | null) => void
  max: number
}

/** One optional line the customer ticks (and can reword); nothing appears until ticked. */
export function SuggestedNoteEditor({ note, suggestion, onChange, max }: NoteProps) {
  const id = useId()
  return (
    <div className="mm-lines">
      <label className="mm-line-option">
        <input type="checkbox" checked={note !== null} onChange={e => onChange(e.target.checked ? suggestion : null)} />
        <span>{note ?? suggestion}</span>
      </label>
      {note !== null && (
        <div className="mm-fld">
          <label htmlFor={id}>Wording</label>
          <input id={id} value={note} {...counted(`${id}-c`, note, max)} onChange={e => onChange(e.target.value.trim() ? e.target.value : null)} />
          <CharCount id={`${id}-c`} value={note} max={max} />
        </div>
      )}
    </div>
  )
}
