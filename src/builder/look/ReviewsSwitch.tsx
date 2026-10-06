import { useId } from 'react'

interface Props {
  on: boolean
  onToggle: () => void
}

/** The reviews extra as an on/off switch. */
export function ReviewsSwitch({ on, onToggle }: Props) {
  const id = useId()
  return (
    <div className="bl-switch-row">
      <span className="bl-switch-text">
        <b id={`${id}-l`}>Show customer reviews</b>
        <span id={`${id}-d`}>You'll add real ones later. We never make them up.</span>
      </span>
      <button
        type="button" role="switch" aria-checked={on} aria-labelledby={`${id}-l`} aria-describedby={`${id}-d`}
        className={`bl-switch${on ? ' on' : ''}`} onClick={onToggle}
      >
        <span className="bl-knob" aria-hidden="true" />
      </button>
    </div>
  )
}
