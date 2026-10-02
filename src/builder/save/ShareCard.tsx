import { useState } from 'react'
import { ApiError } from '../../api/client'
import { resumeLink } from '../../api/draftKey'
import type { Draft } from '../../api/useDraft'
import { CopyLink } from './CopyLink'
import './save.css'

interface Props {
  draft: Draft
}

/** On the go-live step: a preview link to share before publishing, and a link to carry on editing later. */
export function ShareCard({ draft }: Props) {
  const [preview, setPreview] = useState<{ url: string; expiresAt: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const makePreview = async () => {
    setBusy(true)
    setError(null)
    try {
      setPreview(await draft.createPreview())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not make a preview link. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  const expires = preview && new Date(preview.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

  return (
    <section className="mm-form mm-share" aria-labelledby="mm-share-title">
      <h2 id="mm-share-title" className="mm-share-title">Share it before it goes live</h2>
      <p className="mm-share-text">Send a preview link to anyone, or open it on your phone. It shows your last save and isn’t public.</p>
      {preview
        ? <CopyLink label="Preview link" url={preview.url} hint={`Works until ${expires}. Search engines won’t list it.`} />
        : <button type="button" className="mm-share-btn" onClick={makePreview} disabled={busy}>{busy ? 'Making a link…' : 'Get a preview link'}</button>}
      {error && <p className="mm-fld-err" role="alert">{error}</p>}
      {draft.key && (
        <CopyLink
          label="Your link to carry on editing"
          url={resumeLink(window.location.href, draft.key)}
          hint="Opens this site in the builder on any device. Anyone with it can edit your site, so keep it to yourself."
        />
      )}
    </section>
  )
}
