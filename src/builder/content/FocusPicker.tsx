import { useId } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import type { Photo } from '../../site/schema'
import { CENTRE, focusFromKey, focusFromTap } from './focus'

interface Props {
  photo: Photo
  onFocus: (focus: { x: number; y: number }) => void
}

/**
 * "Tap the important part": the customer marks what must stay in view, and every crop of the
 * photo (phone, desktop, the published site and the download) is centred on it.
 */
export function FocusPicker({ photo, onFocus }: Props) {
  const hintId = useId()
  const focus = photo.focus ?? CENTRE
  const tap = (e: MouseEvent<HTMLButtonElement>) => {
    // A keyboard "click" has no position: keep the point where it is.
    if (e.detail === 0) return
    const img = e.currentTarget.querySelector('img')
    if (img) onFocus(focusFromTap(img.getBoundingClientRect(), e.clientX, e.clientY))
  }
  const key = (e: KeyboardEvent<HTMLButtonElement>) => {
    const next = focusFromKey(focus, e.key)
    if (!next) return
    e.preventDefault()
    onFocus(next)
  }
  return (
    <div className="mm-focus" data-preview="img">
      <p className="mm-content-label">Tap the important part</p>
      <p id={hintId} className="mm-note">We keep it in view however the photo is cropped. Arrow keys move it too.</p>
      <button
        type="button"
        className="mm-focus-photo"
        onClick={tap}
        onKeyDown={key}
        aria-describedby={hintId}
        aria-label={`Important part of the photo: ${focus.x}% across, ${focus.y}% down`}
      >
        <img src={photo.url} alt="" />
        <span className="mm-focus-dot" aria-hidden="true" style={{ left: `${focus.x}%`, top: `${focus.y}%` }} />
      </button>
      <p className="sb-sr-only" aria-live="polite">{photo.focus ? `Set to ${focus.x}% across, ${focus.y}% down.` : ''}</p>
    </div>
  )
}
