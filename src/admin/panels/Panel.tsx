import { useId } from 'react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  /** One line under the heading saying how to read it. */
  note?: ReactNode
  wide?: boolean
  children: ReactNode
}

/** One white tile on the dashboard, with its own heading. */
export function Panel({ title, note, wide, children }: Props) {
  const id = useId()
  return (
    <section className={`ad-panel${wide ? ' ad-panel--wide' : ''}`} aria-labelledby={id}>
      <h2 id={id} className="ad-h2">{title}</h2>
      {note && <p className="ad-note">{note}</p>}
      {children}
    </section>
  )
}

/** A table that may scroll sideways on a phone: focusable, so it can be scrolled from the keyboard. */
export function ScrollBox({ label, tall, children }: { label: string; tall?: boolean; children: ReactNode }) {
  return <div className={`ad-scroll${tall ? ' ad-scroll--tall' : ''}`} tabIndex={0} role="region" aria-label={label}>{children}</div>
}
