import { useEffect, useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Photo } from '../../site/schema'
import type { ImageCodec } from '../../photos/resize'
import type { PhotoStore } from '../../photos/store'
import { usePhotoPicker } from './usePhotoPicker'
import type { PickState } from './usePhotoPicker'

/** Injected in tests; the app uses the browser codec and the data-URL store. */
export interface PhotoDeps {
  store?: PhotoStore
  codec?: ImageCodec
}

/**
 * The latest props, readable after an await. Photo processing takes a second or two, and
 * the customer can keep editing meanwhile; saving from a stale snapshot would undo that.
 */
function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  useEffect(() => { ref.current = value })
  return ref
}

interface FilePickProps {
  label: string
  onFile: (file: File | undefined) => void
  busy: boolean
  statusId: string
  invalid: boolean
  inputRef: RefObject<HTMLInputElement | null>
}

/**
 * A real file input, shown as a button, so keyboards and screen readers get a native control.
 * While busy it is aria-disabled rather than disabled, so focus stays put.
 */
function FilePick({ label, onFile, busy, statusId, invalid, inputRef }: FilePickProps) {
  const id = useId()
  return (
    <span className="mm-photo-pick">
      <input
        ref={inputRef}
        id={id}
        className="mm-sr-only mm-photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
        aria-disabled={busy || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={statusId}
        onClick={e => { if (busy) e.preventDefault() }}
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!busy) onFile(file)
        }}
      />
      <label htmlFor={id} className="mm-add-btn mm-photo-btn">{label}</label>
    </span>
  )
}

interface AltProps {
  alt: string
  onChange: (alt: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
}

/** Alt text is required: an emptied field shows an error and keeps the last good description. */
function AltField({ alt, onChange, inputRef }: AltProps) {
  const id = useId()
  const errId = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? alt
  const empty = value.trim() === ''
  return (
    <div className="mm-fld">
      <label htmlFor={id}>Describe this photo <span className="sublab">for people who can’t see it</span></label>
      <input
        ref={inputRef}
        id={id}
        value={value}
        maxLength={160}
        aria-invalid={empty}
        aria-describedby={empty ? errId : undefined}
        onChange={e => {
          const next = e.target.value
          setDraft(next)
          if (next.trim()) onChange(next)
        }}
        onBlur={() => setDraft(null)}
      />
      {empty && <p id={errId} className="mm-field-error" role="alert">Add a short description, e.g. “New boiler fitted in a kitchen”.</p>}
    </div>
  )
}

function Status({ id, state }: { id: string; state: PickState }) {
  return (
    // Always rendered, so screen readers are already listening when a message arrives.
    <p id={id} className={`mm-photo-status${state.status === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
      {state.status === 'working' ? 'Preparing your photo…' : state.status === 'error' ? state.message : ''}
    </p>
  )
}

interface PhotoEditorProps extends PhotoDeps {
  photo: Photo | null
  defaultAlt: string
  onChange: (photo: Photo | null) => void
}

/** One photo (hero or about): pick, resize, describe, replace or remove. */
export function PhotoEditor({ photo, defaultAlt, onChange, store, codec }: PhotoEditorProps) {
  const { state, pick } = usePhotoPicker(store, codec)
  const statusId = useId()
  const latest = useLatest({ defaultAlt, onChange })
  const fileRef = useRef<HTMLInputElement>(null)
  const altRef = useRef<HTMLInputElement>(null)
  // Set after a new photo arrives; the next render with the alt field focuses it once.
  const focusAltNext = useRef(false)

  useEffect(() => {
    if (!focusAltNext.current || !altRef.current) return
    focusAltNext.current = false
    altRef.current.focus()
    altRef.current.select()
  })

  const choose = async (file: File | undefined) => {
    const url = await pick(file)
    if (!url) return
    // A new image gets a fresh description: the old one described a different photo.
    focusAltNext.current = true
    latest.current.onChange({ url, alt: latest.current.defaultAlt })
  }
  const remove = () => {
    onChange(null)
    fileRef.current?.focus()
  }

  return (
    <div className="mm-photo-editor">
      {photo && (
        <div className="mm-photo-row">
          <img className="mm-photo-thumb" src={photo.url} alt="" />
          <AltField alt={photo.alt} onChange={alt => onChange({ ...photo, alt })} inputRef={altRef} />
        </div>
      )}
      <div className="mm-photo-actions">
        <FilePick
          label={photo ? 'Replace photo' : 'Choose a photo'}
          onFile={choose}
          busy={state.status === 'working'}
          statusId={statusId}
          invalid={state.status === 'error'}
          inputRef={fileRef}
        />
        {photo && <button type="button" className="mm-add-btn" onClick={remove}>Remove</button>}
      </div>
      <Status id={statusId} state={state} />
    </div>
  )
}

interface GalleryEditorProps extends PhotoDeps {
  photos: Photo[]
  max: number
  defaultAlt: (index: number) => string
  onChange: (photos: Photo[]) => void
}

/** Up to `max` photos of work, each with its own description. */
export function GalleryEditor({ photos, max, defaultAlt, onChange, store, codec }: GalleryEditorProps) {
  const { state, pick } = usePhotoPicker(store, codec)
  const statusId = useId()
  const latest = useLatest({ photos, defaultAlt, onChange })
  const fileRef = useRef<HTMLInputElement>(null)
  const fullRef = useRef<HTMLParagraphElement>(null)
  const full = photos.length >= max

  const add = async (file: File | undefined) => {
    const url = await pick(file)
    if (!url) return
    const { photos: now, defaultAlt: altFor, onChange: save } = latest.current
    if (now.length >= max) return
    save([...now, { url, alt: altFor(now.length) }])
    if (now.length + 1 >= max) requestAnimationFrame(() => fullRef.current?.focus())
  }
  const update = (i: number, next: Photo) => onChange(photos.map((p, j) => (j === i ? next : p)))
  const remove = (i: number) => {
    onChange(photos.filter((_, j) => j !== i))
    // The add control is always there after a removal.
    requestAnimationFrame(() => fileRef.current?.focus())
  }

  return (
    <div className="mm-photo-editor">
      {photos.length > 0 && (
        <ol className="mm-photo-list">
          {photos.map((p, i) => (
            <li key={i} className="mm-photo-row">
              <img className="mm-photo-thumb" src={p.url} alt="" />
              <AltField alt={p.alt} onChange={alt => update(i, { ...p, alt })} />
              <button type="button" className="mm-chip-x" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}>×</button>
            </li>
          ))}
        </ol>
      )}
      {full
        ? <p ref={fullRef} tabIndex={-1} className="mm-note">That’s the maximum of {max} photos.</p>
        : (
          <FilePick
            label={photos.length ? 'Add another photo' : 'Add a photo'}
            onFile={add}
            busy={state.status === 'working'}
            statusId={statusId}
            invalid={state.status === 'error'}
            inputRef={fileRef}
          />
        )}
      <Status id={statusId} state={state} />
    </div>
  )
}
