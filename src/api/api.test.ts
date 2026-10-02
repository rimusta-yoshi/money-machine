// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { finishedSite } from '../publish/test/sites'
import { siteReducer } from '../site/reducer'
import type { Site } from '../site/schema'
import { ApiError, apiBase, createApi, siteDomain } from './client'
import type { Api } from './client'
import { forgetDraftKey, rememberDraftKey, resumeKeyFromHash, resumeLink, storedDraftKey } from './draftKey'
import { dataUrlToBlob, uploadPhotos } from './uploadPhotos'
import { useDraft } from './useDraft'

const KEY = 'k'.repeat(43)
const DATA_URL = `data:image/jpeg;base64,${btoa('\xff\xd8\xff\xe0fake')}`
const withHero = (site: Site, url: string): Site => ({ ...site, content: { ...site.content, photos: { ...site.content.photos, hero: { url, alt: 'Boiler' } } } })

describe('draft key', () => {
  beforeEach(() => localStorage.clear())

  it('remembers, reads and forgets the key, ignoring junk', () => {
    expect(storedDraftKey()).toBeNull()
    rememberDraftKey(KEY)
    expect(storedDraftKey()).toBe(KEY)
    forgetDraftKey()
    expect(storedDraftKey()).toBeNull()
    localStorage.setItem('siteblocks.draft', '<script>')
    expect(storedDraftKey()).toBeNull()
  })

  it('survives storage that throws', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
    expect(storedDraftKey(broken)).toBeNull()
    expect(() => rememberDraftKey(KEY, broken)).not.toThrow()
    expect(() => forgetDraftKey(broken)).not.toThrow()
  })

  it('keeps the key after the # in resume links', () => {
    const link = resumeLink('http://localhost:5173/?x=1#old', KEY)
    expect(link).toBe(`http://localhost:5173/?x=1#resume=${KEY}`)
    expect(resumeKeyFromHash(new URL(link).hash)).toBe(KEY)
    expect(resumeKeyFromHash('#resume=short')).toBeNull()
    expect(resumeKeyFromHash('')).toBeNull()
  })
})

describe('uploadPhotos', () => {
  it('uploads each data URL once and leaves stored URLs alone', async () => {
    const upload = vi.fn(async () => 'https://preview.example/photos/a/b.jpg')
    const done = new Map<string, string>()
    const site = withHero(finishedSite(), DATA_URL)
    const out = await uploadPhotos(site, upload, done)
    expect(out.content.photos.hero?.url).toBe('https://preview.example/photos/a/b.jpg')
    expect(site.content.photos.hero?.url).toBe(DATA_URL)
    await uploadPhotos(site, upload, done)
    expect(upload).toHaveBeenCalledTimes(1)
    const blob = dataUrlToBlob(DATA_URL)
    expect(blob.type).toBe('image/jpeg')
    expect(blob.size).toBe(8)
  })
})

describe('the API client', () => {
  it('reads its address from the build and finds the site domain', () => {
    expect(apiBase({ VITE_API_URL: 'https://api.siteblocks.co.uk/' })).toBe('https://api.siteblocks.co.uk')
    expect(apiBase({})).toBeNull()
    expect(siteDomain('https://api.siteblocks.co.uk')).toBe('siteblocks.co.uk')
  })

  it('sends the key and admin key as headers, and turns errors into messages', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers)
      if (h.get('X-Admin-Key') !== 'admin') return new Response(JSON.stringify({ error: 'not_allowed', message: 'That admin key is not right.' }), { status: 403 })
      return new Response(JSON.stringify({ slug: 'a', url: 'https://a.x/', auth: h.get('Authorization') }), { status: 200 })
    })
    const api = createApi('https://api.x', fetcher as typeof fetch)
    await expect(api.publish(KEY, 'a', 'nope')).rejects.toMatchObject({ status: 403, code: 'not_allowed', message: 'That admin key is not right.' })
    expect(await api.publish(KEY, 'a', 'admin')).toMatchObject({ auth: `Bearer ${KEY}` })
    const offline = createApi('https://api.x', (async () => { throw new TypeError('fail') }) as typeof fetch)
    await expect(offline.createDraft()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('reducer: drafts', () => {
  it('loads a saved site as is', () => {
    const site = finishedSite()
    expect(siteReducer(null, { type: 'load', site })).toBe(site)
  })

  it('swaps uploaded photo URLs without touching later edits', () => {
    const site = withHero(finishedSite(), DATA_URL)
    const next = siteReducer(site, { type: 'replacePhotoUrls', urls: { [DATA_URL]: 'https://p/x.jpg', 'data:other': 'https://p/y.jpg' } })!
    expect(next.content.photos.hero?.url).toBe('https://p/x.jpg')
    expect(next.content.photos.hero?.alt).toBe('Boiler')
    expect(next.content.photos.gallery).toEqual(site.content.photos.gallery)
  })
})

describe('useDraft', () => {
  const fakeApi = (record: unknown = null) => ({
    createDraft: vi.fn(async () => KEY),
    loadDraft: vi.fn(async () => ({ record, slug: null, publishedUrl: null, updatedAt: 1 })),
    saveDraft: vi.fn(async () => ({ updatedAt: 2 })),
    uploadPhoto: vi.fn(async () => 'https://preview.x/photos/a/b.jpg'),
    createPreview: vi.fn(async () => ({ url: 'https://preview.x/t/', expiresAt: '2026-11-01T00:00:00Z' })),
    slugStatus: vi.fn(async () => ({ slug: 'a', available: true })),
    publish: vi.fn(async () => ({ slug: 'joes', url: 'https://joes.x/' })),
  }) satisfies Api

  beforeEach(() => { localStorage.clear(); window.location.hash = '' })
  afterEach(() => vi.useRealTimers())

  it('saves after edits: creates the draft, uploads photos, then saves the record with stored URLs', async () => {
    const api = fakeApi()
    const onUploaded = vi.fn()
    const site = withHero(finishedSite(), DATA_URL)
    const { result } = renderHook(() => useDraft({ api, site, autosave: true, onLoaded: vi.fn(), onUploaded }))
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), { timeout: 4000 })
    expect(api.createDraft).toHaveBeenCalledTimes(1)
    expect(api.uploadPhoto).toHaveBeenCalledTimes(1)
    const saved = (api.saveDraft.mock.calls[0] as unknown as [string, Site])[1]
    expect(saved.content.photos.hero?.url).toBe('https://preview.x/photos/a/b.jpg')
    expect(onUploaded).toHaveBeenCalledWith({ [DATA_URL]: 'https://preview.x/photos/a/b.jpg' })
    expect(storedDraftKey()).toBe(KEY)
    await waitFor(() => expect(result.current.status.state).toBe('saved'))
  })

  it('does not save the same record twice', async () => {
    const api = fakeApi()
    const site = finishedSite()
    const { result } = renderHook(() => useDraft({ api, site, autosave: false, onLoaded: vi.fn(), onUploaded: vi.fn() }))
    await act(async () => { await result.current.saveNow() })
    await act(async () => { await result.current.saveNow() })
    expect(api.saveDraft).toHaveBeenCalledTimes(1)
  })

  it('reopens a draft from a resume link and keeps the key', async () => {
    const saved = finishedSite()
    const api = fakeApi(JSON.parse(JSON.stringify(saved)))
    window.location.hash = `#resume=${KEY}`
    const onLoaded = vi.fn()
    renderHook(() => useDraft({ api, site: null, autosave: false, onLoaded, onUploaded: vi.fn() }))
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(saved))
    expect(api.loadDraft).toHaveBeenCalledWith(KEY)
    expect(window.location.hash).toBe('')
    expect(storedDraftKey()).toBe(KEY)
  })

  it('forgets a key the server does not know', async () => {
    rememberDraftKey(KEY)
    const api = { ...fakeApi(), loadDraft: vi.fn(async () => { throw new ApiError(401, 'unknown_draft', 'x') }) }
    renderHook(() => useDraft({ api, site: null, autosave: false, onLoaded: vi.fn(), onUploaded: vi.fn() }))
    await waitFor(() => expect(storedDraftKey()).toBeNull())
  })

  it('never starts a new draft over a saved one that failed to open, and retries it', async () => {
    rememberDraftKey(KEY)
    let fail = true
    const saved = finishedSite()
    const api = { ...fakeApi(), loadDraft: vi.fn(async () => {
      if (fail) throw new ApiError(0, 'offline', 'offline')
      return { record: JSON.parse(JSON.stringify(saved)), slug: null, publishedUrl: null, updatedAt: 1 }
    }) }
    const onLoaded = vi.fn()
    const { result } = renderHook(() => useDraft({ api, site: finishedSite(), autosave: false, onLoaded, onUploaded: vi.fn() }))
    await waitFor(() => expect(result.current.status.state).toBe('error'))
    await act(async () => { await result.current.saveNow() })
    expect(api.createDraft).not.toHaveBeenCalled()
    expect(api.saveDraft).not.toHaveBeenCalled()
    expect(storedDraftKey()).toBe(KEY)
    fail = false
    act(() => result.current.retry())
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(saved))
    expect(result.current.key).toBe(KEY)
  })

  it('saves before making a preview link or publishing', async () => {
    const api = fakeApi()
    const { result } = renderHook(() => useDraft({ api, site: finishedSite(), autosave: false, onLoaded: vi.fn(), onUploaded: vi.fn() }))
    await act(async () => { await result.current.createPreview() })
    expect(api.saveDraft).toHaveBeenCalledTimes(1)
    expect(api.createPreview).toHaveBeenCalledWith(KEY)
    await act(async () => { await result.current.publish('joes', 'admin') })
    expect(api.publish).toHaveBeenCalledWith(KEY, 'joes', 'admin')
    expect(result.current.published).toEqual({ slug: 'joes', url: 'https://joes.x/' })
  })
})
