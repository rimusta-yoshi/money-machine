import { useState } from 'react'
import type { OwnDomain } from '../api/client'

/** Puts text on the clipboard; false if the browser won't (old browsers, blocked permission). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** A value with a Copy button that says when it worked (to screen readers too). */
export function CopyValue({ label, value }: { label: string; value: string }) {
  const [said, setSaid] = useState('')
  const copy = async () => setSaid((await copyText(value)) ? 'Copied' : 'Select it and copy')
  return (
    <span className="od-copy">
      <code className="od-value">{value}</code>
      <button type="button" className="od-copy-btn" onClick={copy} aria-label={`Copy ${label}: ${value}`}>Copy</button>
      <span className="od-copied" role="status" aria-live="polite">{said}</span>
    </span>
  )
}

/** The record(s) to add at the domain company: type, name and value, each easy to copy. */
export function DomainRecords({ records }: { records: OwnDomain['records'] }) {
  return (
    <div className="od-records">
      {records.map(r => (
        <dl key={r.name} className="od-record" aria-label={`Record for ${r.name}`}>
          <div><dt>Type</dt><dd><code className="od-value">{r.type}</code></dd></div>
          <div><dt>Name (or Host)</dt><dd><CopyValue label="name" value={r.name} /></dd></div>
          <div><dt>Value (or Points to, Target)</dt><dd><CopyValue label="value" value={r.value} /></dd></div>
          <div><dt>TTL</dt><dd>Leave as it is (or 1 hour)</dd></div>
        </dl>
      ))}
    </div>
  )
}

/** **Bold** in guide text, without any HTML. */
export function Rich({ text }: { text: string }) {
  return <>{text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))}</>
}
