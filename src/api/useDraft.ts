import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseSite } from '../site/parse'
import type { Site } from '../site/schema'
import { ApiError } from './client'
import type { Api, DraftState } from './client'
import { clearHash, editTokenFromHash, forgetDraftKey, rememberDraftKey, storedDraftKey } from './draftKey'
import { isDataUrl, sitePhotos } from '../publish/photos'
import { forgetLocalSite, loadLocalSite, saveLocalSite, withoutStoredPhotos } from './localSite'
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

/** An edit link opened in a browser that holds a different site: the two business names. */
export interface EditConflict { here: string; link: string }

/** After paying: re-publishing is free; after a refund the site is down for good. */
export interface Account { paid: boolean; refunded: boolean }

const AUTOSAVE_MS = 2000
const NOT_KEPT = 'This browser won’t keep your site (storage is off or full). Finish in one go, or allow site data.'

const message = (err: unknown) => (err instanceof ApiError ? err.message : 'Your changes could not be saved. Please try again.')

/**
 * The site's saving. Edits are kept in this browser only (photos uploaded as they're added);
 * the server gets a copy just before a preview link, a checkout or a re-publish. On start it
 * reopens an edit link (#edit=…, from the welcome email), else this browser's own copy.
 * With no API configured it still keeps the site in the browser.
 */
export function useDraft({ api, site, autosave, onLoaded, onUploaded }: Options) {
  const [key, setKey] = useState<string | null>(null)
  const [status, setStatus] = useState<SaveStatus>({ state: 'idle' })
  const [published, setPublished] = useState<{ slug: string; url: string } | null>(null)
  const [account, setAccount] = useState<Account>({ paid: false, refunded: false })
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null)
  const [conflict, setConflict] = useState<EditConflict | null>(null)
  const choice = useRef<{ open: () => void; keep: () => void } | null>(null)
  const keyRef = useRef<string | null>(null)
  const uploads = useRef(new Map<string, string>())
  /** The record as last kept in this browser, and as last sent to the server. */
  const lastLocal = useRef<string | null>(null)
  const lastServer = useRef<string | null>(null)
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

  const applyState = useCallback((d: DraftState) => {
    setPublished(d.slug && d.publishedUrl ? { slug: d.slug, url: d.publishedUrl } : null)
    setAccount({ paid: !!d.paid, refunded: !!d.refunded })
  }, [])

  /**
   * A site being opened from the server (an edit link, or a copy from before the browser kept
   * its own). Until it opens nothing is saved, so a failed load can never start a new site over it.
   */
  const reopening = useRef<string | null>(null)

  /** Opens a site the server sent: it becomes this browser's site. */
  const apply = useCallback((k: string, fromLink: boolean, d: DraftState, loaded: Site | null) => {
    adoptKey(k)
    if (fromLink) clearHash()
    applyState(d)
    if (!loaded) return
    lastServer.current = JSON.stringify(loaded)
    lastLocal.current = lastServer.current
    saveLocalSite(loaded)
    setStatus({ state: 'saved', at: d.updatedAt })
    loadedRef.current(loaded)
  }, [adoptKey, applyState])

  /** This browser's copy is open already: just learn whether it's paid for or live. */
  const refresh = useCallback((k: string) => {
    if (!api) return
    keyRef.current = k
    api.loadDraft(k).then(d => { adoptKey(k); applyState(d) }, err => {
      if (!(err instanceof ApiError && err.status === 401)) {
        // Offline for now: keep using it.
        adoptKey(k)
        return
      }
      forgetDraftKey()
      keyRef.current = null
      setKey(null)
      if (k.startsWith('edit.')) {
        setNotice({ id: Date.now(), text: 'That edit link has been replaced. Open the newest one from your email to publish changes.' })
        return
      }
      // Cleared after 30 days unused, photos and all: the site carries on without them.
      const local = loadLocalSite()
      if (local && sitePhotos(local).some(photo => !isDataUrl(photo.url))) {
        const cleaned = withoutStoredPhotos(local)
        saveLocalSite(cleaned)
        lastLocal.current = JSON.stringify(cleaned)
        loadedRef.current(cleaned)
        setNotice({ id: Date.now(), text: 'Your photos were cleared after 30 days without use. Please add them again.' })
      }
    })
  }, [api, adoptKey, applyState])

  const openLocal = useCallback((local: Site, k: string | null) => {
    lastLocal.current = JSON.stringify(local)
    loadedRef.current(local)
    if (k) refresh(k)
  }, [refresh])

  const reopen = useCallback((k: string, fromLink: boolean, here: { site: Site; key: string | null } | null = null): Promise<void> => {
    if (!api) return Promise.resolve()
    reopening.current = k
    return api.loadDraft(k).then(d => {
      reopening.current = null
      const loaded = d.record ? parseSite(d.record) : null
      // An edit link in a browser that holds another site: ask before replacing it.
      if (fromLink && here && loaded && JSON.stringify(loaded) !== JSON.stringify(here.site)) {
        clearHash()
        choice.current = { open: () => apply(k, true, d, loaded), keep: () => openLocal(here.site, here.key) }
        setConflict({ here: here.site.business.name, link: loaded.business.name })
        return
      }
      apply(k, fromLink, d, loaded)
    }, err => {
      if (err instanceof ApiError && err.status === 401) {
        reopening.current = null
        if (fromLink) {
          clearHash()
          setStatus({ state: 'error', message: 'That edit link isn’t right. Ask for a new one with “Lost your edit link?”.' })
          if (here) openLocal(here.site, here.key)
        } else {
          forgetDraftKey()
        }
        return
      }
      console.error('Could not open the saved site', err)
      setStatus({ state: 'error', message: 'We couldn’t open your saved site. Check your connection and retry.' })
    })
  }, [api, apply, openLocal])

  /** The answer to "replace the site in this browser?": true opens the edit link's site. */
  const resolveConflict = useCallback((openLink: boolean) => {
    const c = choice.current
    choice.current = null
    setConflict(null)
    if (c) (openLink ? c.open : c.keep)()
  }, [])

  // On start: an edit link wins, then this browser's copy, then a copy only the server has.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const fromLink = editTokenFromHash(window.location.hash)
    const local = loadLocalSite()
    const k = storedDraftKey()
    if (fromLink) { void reopen(fromLink, true, local && k !== fromLink ? { site: local, key: k } : null); return }
    if (local) { openLocal(local, k); return }
    if (k) void reopen(k, false)
  }, [reopen, openLocal])

  const ensureKey = useCallback(async (): Promise<string> => {
    if (keyRef.current) return keyRef.current
    if (!api) throw new ApiError(0, 'not_saved', 'Going live isn’t switched on in this version of the builder.')
    const k = await api.createDraft()
    adoptKey(k)
    return k
  }, [api, adoptKey])

  /** Runs one saving job after any already running. */
  const enqueue = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(job, job)
    queue.current = next.catch(() => undefined)
    return next
  }, [])

  /** Uploads new photos (so the record stays small) and keeps the record in this browser. */
  const keepLocally = useCallback(async (current: Site): Promise<Site> => {
    const before = uploads.current.size
    const ready = api
      ? await uploadPhotos(current, async photo => {
        setStatus({ state: 'saving' })
        return api.uploadPhoto(await ensureKey(), photo)
      }, uploads.current)
      : current
    if (uploads.current.size > before) onUploaded(Object.fromEntries(uploads.current))
    const json = JSON.stringify(ready)
    if (json !== lastLocal.current) {
      if (!saveLocalSite(ready)) throw new Error(NOT_KEPT)
      lastLocal.current = json
      setStatus({ state: 'saved', at: Date.now() })
    }
    return ready
  }, [api, ensureKey, onUploaded])

  /** Keeps the latest edits in this browser now. Resolves to the kept record, or null if there's nothing to keep. */
  const saveNow = useCallback((latest?: Site): Promise<Site | null> => enqueue(async () => {
    const current = latest ?? siteRef.current
    if (!current || reopening.current) return null
    try {
      return await keepLocally(current)
    } catch (err) {
      setStatus({ state: 'error', message: err instanceof Error && err.message === NOT_KEPT ? NOT_KEPT : message(err) })
      throw err
    }
  }), [enqueue, keepLocally])

  /** Sends the record to the server (for a preview, a checkout or a re-publish). Resolves to the draft key. */
  const sendToServer = useCallback((latest?: Site): Promise<string> => enqueue(async () => {
    const current = latest ?? siteRef.current
    if (!api || !current || reopening.current) throw new ApiError(0, 'not_saved', 'Your site isn’t ready to send yet. Please try again.')
    try {
      const ready = await keepLocally(current).catch(err => {
        // Not kept in the browser is no reason not to go live.
        if (err instanceof Error && err.message === NOT_KEPT) return current
        throw err
      })
      const k = await ensureKey()
      const json = JSON.stringify(ready)
      if (json !== lastServer.current) {
        setStatus({ state: 'saving' })
        await api.saveDraft(k, ready)
        lastServer.current = json
        setStatus({ state: 'saved', at: Date.now() })
      }
      return k
    } catch (err) {
      setStatus({ state: 'error', message: message(err) })
      throw err
    }
  }), [api, enqueue, ensureKey, keepLocally])

  useEffect(() => {
    if (!autosave || !site) return
    const t = setTimeout(() => { saveNow().catch(() => undefined) }, AUTOSAVE_MS)
    return () => clearTimeout(t)
  }, [autosave, site, saveNow])

  const createPreview = useCallback(async () => {
    const k = await sendToServer()
    return api!.createPreview(k)
  }, [api, sendToServer])

  /** Sends the checked record and opens a Stripe Checkout for it: resolves to Stripe's page. */
  const checkout = useCallback(async (slug: string, latest?: Site) => {
    const k = await sendToServer(latest)
    return api!.checkout(k, slug)
  }, [api, sendToServer])

  /** Re-publishes a paid site for free (slug omitted), or publishes with the admin key (testing and support). */
  const publish = useCallback(async (slug: string | undefined, admin: string | undefined, latest?: Site) => {
    const k = await sendToServer(latest)
    const res = await api!.publish(k, slug, admin)
    setPublished(res)
    return res
  }, [api, sendToServer])

  const slugStatus = useCallback(async (slug: string) => {
    if (!api) return null
    return api.slugStatus(await ensureKey(), slug)
  }, [api, ensureKey])

  const dismissNotice = useCallback(() => setNotice(null), [])

  /** The Retry button: reopens the saved site if that failed, else saves again. */
  const retry = useCallback(() => {
    if (reopening.current) void reopen(reopening.current, false)
    else saveNow().catch(() => undefined)
  }, [reopen, saveNow])

  /** "Start over": forgets this browser's site; the next save starts a new one. A paid site stays reachable by its edit link. */
  const forget = useCallback(() => {
    reopening.current = null
    forgetDraftKey()
    forgetLocalSite()
    keyRef.current = null
    setKey(null)
    lastLocal.current = null
    lastServer.current = null
    uploads.current.clear()
    setPublished(null)
    setAccount({ paid: false, refunded: false })
    setStatus({ state: 'idle' })
  }, [])

  return useMemo(
    () => ({
      enabled: !!api, key, status, published, account, notice, dismissNotice, conflict, resolveConflict,
      saveNow, retry, createPreview, checkout, publish, slugStatus, forget,
    }),
    [api, key, status, published, account, notice, dismissNotice, conflict, resolveConflict, saveNow, retry, createPreview, checkout, publish, slugStatus, forget],
  )
}

export type Draft = ReturnType<typeof useDraft>
