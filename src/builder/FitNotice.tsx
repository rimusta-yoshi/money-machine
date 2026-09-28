import { useEffect, useState } from 'react'
import type { Notice } from './useHeroFitRepair'

const AUTO_HIDE_MS = 12000

interface Props {
  notice: Notice | null
  onDismiss: () => void
}

/**
 * A small, polite heads-up. The live region stays mounted and holds only the message, so
 * screen readers catch it without also reading the button. It won't vanish while the
 * pointer or keyboard focus is on it.
 */
export function FitNotice({ notice, onDismiss }: Props) {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!notice || held) return
    const t = setTimeout(onDismiss, AUTO_HIDE_MS)
    return () => clearTimeout(t)
  }, [notice, held, onDismiss])

  return (
    <div
      className={`mm-fit-notice${notice ? ' show' : ''}`}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <p className="mm-fit-notice-text" role="status" aria-live="polite">{notice?.text ?? ''}</p>
      {notice && <button type="button" className="mm-fit-notice-x" onClick={onDismiss} aria-label="Dismiss">×</button>}
    </div>
  )
}
