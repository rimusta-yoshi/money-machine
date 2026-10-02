import { useId, useRef, useState } from 'react'

interface Props {
  label: string
  url: string
  hint?: string
}

/** A link shown in a read-only field with a Copy button (and select-all where copying isn't allowed). */
export function CopyLink({ label, url, hint }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      input.current?.select()
    }
  }
  return (
    <div className="mm-fld mm-copy">
      <label htmlFor={id}>{label}</label>
      <div className="mm-copy-row">
        <input ref={input} id={id} type="text" readOnly value={url} onFocus={e => e.currentTarget.select()} aria-describedby={hint ? `${id}-hint` : undefined} />
        <button type="button" className="mm-copy-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      {hint && <div id={`${id}-hint`} className="mm-fld-hint">{hint}</div>}
      <span className="mm-sr" role="status" aria-live="polite">{copied ? 'Link copied' : ''}</span>
    </div>
  )
}
