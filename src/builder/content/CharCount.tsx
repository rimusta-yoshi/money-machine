import { COUNTER_FROM } from '../../site/limits'

interface Props {
  id: string
  value: string
  max: number
}

/**
 * A gentle character counter: invisible until the field is 70% full, then "32 of 40".
 * Linked to its field with aria-describedby, so screen readers hear it on focus rather
 * than on every keystroke. The field's own maxLength does the enforcing.
 */
export function CharCount({ id, value, max }: Props) {
  const n = value.length
  const show = n >= Math.ceil(max * COUNTER_FROM)
  return (
    <p id={id} className={`mm-count${n >= max ? ' full' : ''}`} hidden={!show}>
      {n >= max ? `${n} of ${max} characters: that’s the most that fits` : `${n} of ${max} characters`}
    </p>
  )
}
