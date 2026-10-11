import { useState } from 'react'
import type { FormEvent } from 'react'

interface Props {
  /** Why the key was asked for again (a wrong key), if it was. */
  notice: string | null
  onKey: (key: string) => void
}

/** Asks for the admin key (ADMIN_TOKEN). It's kept for this tab only. */
export function KeyForm({ notice, onKey }: Props) {
  const [value, setValue] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (value.trim()) onKey(value.trim())
  }
  return (
    <main className="ad-main ad-key">
      <h1 className="ad-h1">Dashboard</h1>
      <form onSubmit={submit} className="ad-key-form" aria-describedby={notice ? 'ad-key-notice' : undefined}>
        {notice && <p id="ad-key-notice" className="bf-error" role="alert">{notice}</p>}
        <div className="bf-field">
          <label className="bf-label" htmlFor="ad-key-input">Admin key</label>
          <input
            id="ad-key-input" className="bf-input" type="password" autoComplete="current-password" required
            value={value} onChange={e => setValue(e.target.value)} aria-invalid={notice ? true : undefined}
          />
          <p className="bf-hint">The ADMIN_TOKEN secret. It’s kept in this tab until you close it or sign out.</p>
        </div>
        <button type="submit" className="sb-main-btn">Show the numbers</button>
      </form>
    </main>
  )
}
