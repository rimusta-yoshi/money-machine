import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseSite } from '../site/parse'
import type { Site } from '../site/schema'
import { ApiError } from './client'
import type { Api } from './client'
import { forgetDraftKey, rememberDraftKey, resumeKeyFromHash, storedDraftKey } from './draftKey'
import { uploadPhotos } from './uploadPhotos'

export type SaveStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved'; at: number }
  | { state: 'error'; message: string }

interface Options {
  api: Api | null
  site: Site | null
  /** Save automatically after edits (from the build step on). */
  autosave: boolean
  onLoaded: (site: Site) => void
  /** Photos went up to storage: swap data URLs for stored URLs in the record. */
  onUploaded: (urls: Record<string, string>) => void
}

const AUTOSAVE_MS = 2000

const message = (err: unknown) => (err instanceof ApiError ? err.message : 'Your changes could not be saved. Please try again.')

/**
 * The draft on the server: resumes this browser's draft (or a resume link) on start, saves
 * after edits (uploading photos first), and makes preview links and publishes. With no API
 * configured it does nothing, and the builder works as before.
 */
export function useDraft({ api, site, autosave, onLoaded, onUploaded }: Options) {
  const [key, setKey] = useState<string | null>(null)
  const [status, setStatus] = useState<SaveStatus>({ state: 'idle' })
  const [published, setPublished] = useState<{ slug: string; url: string } | null>(null)
  const keyRef = useRef<string | null>(null)
  const uploads = useRef(new Map<string, string>())
  const lastSaved = useRef<string | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const siteRef = useRef(site)
  useEffect(() => { siteRef.current = site }, [site])
  const loadedRef = useRef(onLoaded)
  useEffect(() => { loadedRef.current = onLoaded }, [onLoaded])

  const adoptKey = useCallback((k: string | null) => {
    keyRef.current = k
    setKey(k)
    if (k) rememberDraftKey(k)
  }, [])

  /**
   * A saved draft being reopened. Until it opens, nothing is saved, so a failed load (offline,
   * a server error) can never start a new draft over the customer's saved, maybe published, site.
   */
  const reopening = useRef<string | null>(null)

  const reopen = useCallback((k: string, fromLink: boolean): Promise<void> => {
    if (!api) return Promise.resolve()
    reopening.current = k
    if (fromLink) rememberDraftKey(k)
    return api.loadDraft(k).then(d => {
      reopening.current = null
      adoptKey(k)
      if (fromLink) window.history.replaceState(null, '', window.location.pathname + window.location.search)
      if (d.slug && d.publishedUrl) setPublished({ slug: d.slug, url: d.publishedUrl })
      if (!d.record) return
      const loaded = parseSite(d.record)
      lastSaved.current = JSON.stringify(loaded)
      setStatus({ state: 'saved', at: d.updatedAt })
      loadedRef.current(loaded)
    }, err => {
      if (err instanceof ApiError && err.status === 401) {
        // The server doesn't know this key: start afresh.
        reopening.current = null
        forgetDraftKey()
        return
      }
      console.error('Could not reopen the saved site', err)
      setStatus({ state: 'error', message: 'We couldn’t open your saved site. Check your connection and retry.' })
    })
  }, [api, adoptKey])

  // Reopen a draft on start: a resume link wins over this browser's last draft.
  useEffect(() => {
    const fromLink = resumeKeyFromHash(window.location.hash)
    const k = fromLink ?? storedDraftKey()
    if (k) void reopen(k, !!fromLink)
  }, [reopen])

  /**
   * Saves now (waiting for any save already running). Resolves to the saved record, or null if
   * there's nothing to save. `latest` is a record newer than the last render (just checked before publishing).
   */
  const saveNow = useCallback((latest?: Site): Promise<Site | null> => {
    const run = async (): Promise<Site | null> => {
      const current = latest ?? siteRef.current
      if (!api || !current || reopening.current) return null
      try {
        let k = keyRef.current
        if (!k) {
          setStatus({ state: 'saving' })
          k = await api.createDraft()
          adoptKey(k)
        }
        const key = k
        const before = uploads.current.size
        const ready = await uploadPhotos(current, photo => {
          setStatus({ state: 'saving' })
          return api.uploadPhoto(key, photo)
        }, uploads.current)
        if (uploads.current.size > before) onUploaded(Object.fromEntries(uploads.current))
        const json = JSON.stringify(ready)
        // Nothing changed since the last save: no request, no status change.
        if (json === lastSaved.current) return ready
        setStatus({ state: 'saving' })
        await api.saveDraft(key, ready)
        lastSaved.current = json
        setStatus({ state: 'saved', at: Date.now() })
        return ready
      } catch (err) {
        setStatus({ state: 'error', message: message(err) })
        throw err
      }
    }
    const next = queue.current.then(run, run)
    queue.current = next.catch(() => undefined)
    return next
  }, [api, onUploaded, adoptKey])

  useEffect(() => {
    if (!api || !autosave || !site) return
    const t = setTimeout(() => { saveNow().catch(() => undefined) }, AUTOSAVE_MS)
    return () => clearTimeout(t)
  }, [api, autosave, site, saveNow])

  const createPreview = useCallback(async () => {
    await saveNow()
    if (!api || !keyRef.current) throw new ApiError(0, 'not_saved', 'Save your site first.')
    return api.createPreview(keyRef.current)
  }, [api, saveNow])

  const publish = useCallback(async (slug: string, admin: string, latest?: Site) => {
    await saveNow(latest)
    if (!api || !keyRef.current) throw new ApiError(0, 'not_saved', 'Save your site first.')
    const res = await api.publish(keyRef.current, slug, admin)
    setPublished(res)
    return res
  }, [api, saveNow])

  const slugStatus = useCallback(async (slug: string) => {
    if (!api || !keyRef.current) return null
    return api.slugStatus(keyRef.current, slug)
  }, [api])

  /** The Retry button: reopens the saved draft if that failed, else saves again. */
  const retry = useCallback(() => {
    if (reopening.current) void reopen(reopening.current, false)
    else saveNow().catch(() => undefined)
  }, [reopen, saveNow])

  /** "Start over": the next save starts a new draft; the old one stays reachable by its resume link. */
  const forget = useCallback(() => {
    reopening.current = null
    forgetDraftKey()
    keyRef.current = null
    setKey(null)
    lastSaved.current = null
    uploads.current.clear()
    setPublished(null)
    setStatus({ state: 'idle' })
  }, [])

  return useMemo(
    () => ({ enabled: !!api, key, status, published, saveNow, retry, createPreview, publish, slugStatus, forget }),
    [api, key, status, published, saveNow, retry, createPreview, publish, slugStatus, forget],
  )
}

export type Draft = ReturnType<typeof useDraft>
