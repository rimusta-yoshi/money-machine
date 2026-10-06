import { useId } from 'react'
import type { InputHTMLAttributes, Ref } from 'react'
import { CharCount } from '../content/CharCount'
import { counted } from '../content/counted'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement & HTMLTextAreaElement>, 'value' | 'onChange' | 'id'>

interface Props extends InputProps {
  label: string
  value: string
  onValue: (value: string) => void
  /** Helper text under the field, always read with it. */
  hint?: string
  /** A friendly problem message; marks the field invalid while shown. */
  error?: string | null
  /** Show the gentle "32 of 40" counter near this limit (also sets maxLength). */
  count?: number
  multiline?: boolean
  inputRef?: Ref<HTMLInputElement & HTMLTextAreaElement>
}

/** A labelled text field in the builder's style: label above, helper or error below. */
export function TextField({ label, value, onValue, hint, error, count, multiline, inputRef, ...rest }: Props) {
  const id = useId()
  const counter = count ? counted(`${id}-count`, value, count) : null
  const describedBy = [error ? `${id}-err` : hint ? `${id}-hint` : null, counter?.['aria-describedby']].filter(Boolean).join(' ') || undefined
  const shared = {
    ...rest,
    id,
    ref: inputRef,
    value,
    maxLength: counter?.maxLength ?? rest.maxLength,
    onChange: (e: { target: { value: string } }) => onValue(e.target.value),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    className: 'bf-input',
  }
  return (
    <div className="bf-field">
      <label htmlFor={id} className="bf-label">{label}</label>
      {multiline ? <textarea {...shared} /> : <input type={rest.type ?? 'text'} {...shared} />}
      {error
        ? <p id={`${id}-err`} className="bf-error">{error}</p>
        : hint && <p id={`${id}-hint`} className="bf-hint">{hint}</p>}
      {count && <CharCount id={`${id}-count`} value={value} max={count} />}
    </div>
  )
}
