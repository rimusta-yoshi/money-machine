// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { finishedSite } from '../publish/test/sites'
import { siteReducer } from '../site/reducer'
import type { Site } from '../site/schema'
import { ApiError, apiBase, createApi, siteDomain } from './client'
import type { Api } from './client'
import { editTokenFromHash, forgetDraftKey, refundTokenFromHash, rememberDraftKey, storedDraftKey } from './draftKey'
import { loadLocalSite, saveLocalSite } from './localSite'
import { dataUrlToBlob, uploadPhotos } from './uploadPhotos'
import { useDraft } from './useDraft'

const KEY = 'k'.repeat(43)
const EDIT = `edit.${'a'.repeat(32)}.1.${'s'.repeat(43)}`
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

  it('reads edit and refund tokens from links, and keeps an edit token as the key', () => {
    expect(editTokenFromHash(`#edit=${EDIT}`)).toBe(EDIT)
    expect(editTokenFromHash(`#edit=${KEY}`)).toBeNull()
    expect(editTokenFromHash('#edit=edit.nope')).toBeNull()
    const refund = `refund.${'a'.repeat(32)}.${'s'.repeat(43)}`
    expect(refundTokenFromHash(`#refund=${refund}`)).toBe(refund)
    expect(refundTokenFromHash(`#refund=${EDIT}`)).toBeNull()
    rememberDraftKey(EDIT)
    expect(storedDraftKey()).toBe(EDIT)
  })
})

describe('the site kept in this browser', () => {
  beforeEach(() => localStorage.clear())

  it('keeps and reads back a site, and ignores junk or full storage', () => {
    expect(loadLocalSite()).toBeNull()
    const site = finishedSite()
    expect(saveLocalSite(site)).toBe(true)
    expect(loadLocalSite()).toEqual(site)
    localStorage.setItem('siteblocks.site', '{"hello":1}')
    expect(loadLocalSite()).toBeNull()
    const full = { setItem: () => { throw new Error('QuotaExceededError') } }
    expect(saveLocalSite(site, full)).toBe(false)
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

  it('says how to fix the local certificate when the local server is out of reach', async () => {
    const offline = (base: string) => createApi(base, (async () => { throw new TypeError('fail') }) as typeof fetch)
    await expect(offline('https://api.siteblocks.localhost:8787').createDraft()).rejects.toMatchObject({ message: expect.stringContaining('open https://api.siteblocks.localhost:8787/health') })
    await expect(offline('https://api.siteblocks.co.uk').createDraft()).rejects.toMatchObject({ message: 'We could not reach the server. Check your connection and try again.' })
  })

  it('sends the tester code with a checkout only when there is one', async () => {
    const bodies: unknown[] = []
    const api = createApi('https://api.x', (async (_u: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ url: 'https://stripe/x' }), { status: 201 })
    }) as typeof fetch)
    await api.checkout(KEY, 'joes')
    await api.checkout(KEY, 'joes', 'tester-1234')
    expect(bodies).toEqual([{ slug: 'joes' }, { slug: 'joes', testerCode: 'tester-1234' }])
  })

  it('reads a used or expired refund link as a state to show, not an error', async () => {
    const api = createApi('https://api.x', (async () => new Response(JSON.stringify({ state: 'expired', support: 'help@x.co' }), { status: 409 })) as typeof fetch)
    expect(await api.refund('t')).toEqual({ state: 'expired', support: 'help@x.co' })
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
  const fakeApi = (record: unknown = null, state: { paid?: boolean; slug?: string | null } = {}) => ({
    createDraft: vi.fn(async () => KEY),
    loadDraft: vi.fn(async () => ({ record, slug: state.slug ?? null, publishedUrl: state.slug ? `https://${state.slug}.x/` : null, updatedAt: 1, paid: !!state.paid, refunded: false })),
    saveDraft: vi.fn(async () => ({ updatedAt: 2 })),
    uploadPhoto: vi.fn(async () => 'https://preview.x/photos/a/b.jpg'),
    createPreview: vi.fn(async () => ({ url: 'https://preview.x/t/', expiresAt: '2026-11-01T00:00:00Z' })),
    slugStatus: vi.fn(async () => ({ slug: 'a', available: true })),
    publish: vi.fn(async () => ({ slug: 'joes', url: 'https://joes.x/' })),
    checkout: vi.fn(async () => 'https://checkout.stripe.com/c/pay/cs_test_1'),
    checkoutStatus: vi.fn(async () => ({ state: 'waiting' as const })),
    refundStatus: vi.fn(async () => ({ state: 'used' as const })),
    refund: vi.fn(async () => ({ state: 'used' as const })),
    requestEditLink: vi.fn(async () => 'sent'),
    shop: vi.fn(async () => ({ pricePence: 9900, currency: 'gbp', launched: true, refundDays: 14 })),
  }) satisfies Api

  beforeEach(() => { localStorage.clear(); window.location.hash = '' })
  afterEach(() => vi.useRealTimers())

  it('autosaves in this browser only: photos uploaded, the record never sent', async () => {
    const api = fakeApi()
    const onUploaded = vi.fn()
    const site = withHero(finishedSite(), DATA_URL)
    const { result } = renderHook(() => useDraft({ api, site, autosave: true, onLoaded: vi.fn(), onUploaded }))
    await waitFor(() => expect(result.current.status.state).toBe('saved'), { timeout: 4000 })
    expect(api.uploadPhoto).toHaveBeenCalledTimes(1)
    expect(onUploaded).toHaveBeenCalledWith({ [DATA_URL]: 'https://preview.x/photos/a/b.jpg' })
    expect(loadLocalSite()?.content.photos.hero?.url).toBe('https://preview.x/photos/a/b.jpg')
    expect(api.saveDraft).not.toHaveBeenCalled()
    expect(storedDraftKey()).toBe(KEY)
  })

  it('keeps a site with no photos without making a server copy at all', async () => {
    const api = fakeApi()
    const { result } = renderHook(() => useDraft({ api, site: finishedSite(), autosave: false, onLoaded: vi.fn(), onUploaded: vi.fn() }))
    await act(async () => { await result.current.saveNow() })
    expect(loadLocalSite()).toEqual(finishedSite())
    expect(api.createDraft).not.toHaveBeenCalled()
  })

  it('reopens this browser’s site on start, and learns whether it is paid for', async () => {
    const saved = finishedSite()
    saveLocalSite(saved)
    rememberDraftKey(KEY)
    const api = fakeApi(null, { paid: true, slug: 'joes' })
    const onLoaded = vi.fn()
    const { result } = renderHook(() => useDraft({ api, site: null, autosave: false, onLoaded, onUploaded: vi.fn() }))
    expect(onLoaded).toHaveBeenCalledWith(saved)
    await waitFor(() => expect(result.current.account.paid).toBe(true))
    expect(result.current.published).toEqual({ slug: 'joes', url: 'https://joes.x/' })
  })

  it('opens a paid site from an edit link, on any device, and keeps the link as its key', async () => {
    const saved = finishedSite()
    const api = fakeApi(JSON.parse(JSON.stringify(saved)), { paid: true, slug: 'joes' })
    window.location.hash = `#edit=${EDIT}`
    const onLoaded = vi.fn()
    const { result } = renderHook(() => useDraft({ api, site: null, autosave: false, onLoaded, onUploaded: vi.fn() }))
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(saved))
    expect(api.loadDraft).toHaveBeenCalledWith(EDIT)
    expect(window.location.hash).toBe('')
    expect(storedDraftKey()).toBe(EDIT)
    expect(loadLocalSite()).toEqual(saved)
    expect(result.current.account.paid).toBe(true)
  })

  it('asks before an edit link replaces a different site this browser is building', async () => {
    const mine = finishedSite({ business: { name: 'Unpaid Ltd' } })
    const paid = finishedSite({ business: { name: 'Paid Ltd' } })
    for (const openLink of [false, true]) {
      localStorage.clear()
      saveLocalSite(mine)
      rememberDraftKey(KEY)
      window.location.hash = `#edit=${EDIT}`
      const onLoaded = vi.fn()
      const api = fakeApi(JSON.parse(JSON.stringify(paid)), { paid: true, slug: 'paid' })
      const { result, unmount } = renderHook(() => useDraft({ api, site: null, autosave: false, onLoaded, onUploaded: vi.fn() }))
      await waitFor(() => expect(result.current.conflict).toEqual({ here: 'Unpaid Ltd', link: 'Paid Ltd' }))
      expect(onLoaded).not.toHaveBeenCalled()
      expect(loadLocalSite()).toEqual(mine)
      act(() => result.current.resolveConflict(openLink))
      expect(onLoaded).toHaveBeenCalledWith(openLink ? paid : mine)
      expect(loadLocalSite()).toEqual(openLink ? paid : mine)
      expect(storedDraftKey()).toBe(openLink ? EDIT : KEY)
      unmount()
    }
  })

  it('drops photos the server cleared after 30 days unused, and says so', async () => {
    saveLocalSite(withHero(finishedSite(), 'https://preview.x/photos/a/b.jpg'))
    rememberDraftKey(KEY)
    const api = { ...fakeApi(), loadDraft: vi.fn(async () => { throw new ApiError(401, 'unknown_draft', 'x') }) }
    const onLoaded = vi.fn()
    const { result } = renderHook(() => useDraft({ api, site: null, autosave: false, onLoaded, onUploaded: vi.fn() }))
    await waitFor(() => expect(result.current.notice?.text).toContain('photos were cleared'))
    expect(loadLocalSite()?.content.photos.hero).toBeNull()
    expect(onLoaded).toHaveBeenLastCalledWith(expect.objectContaining({ content: expect.objectContaining({ photos: expect.objectContaining({ hero: null }) }) }))
  })

  it('says so when an edit link is not right', async () => {
    window.location.hash = `#edit=${EDIT}`
    const api = { ...fakeApi(), loadDraft: vi.fn(async () => { throw new ApiError(401, 'unknown_draft', 'x') }) }
    const { result } = renderHook(() => useDraft({ api, site: null, autosave: false, onLoaded: vi.fn(), onUploaded: vi.fn() }))
    await waitFor(() => expect(result.current.status).toMatchObject({ state: 'error', message: expect.stringContaining('edit link') }))
  })

  it('forgets a key the server no longer knows, keeping the site', async () => {
    saveLocalSite(finishedSite())
    rememberDraftKey(KEY)
    const api = { ...fakeApi(), loadDraft: vi.fn(async () => { throw new ApiError(401, 'unknown_draft', 'x') }) }
    renderHook(() => useDraft({ api, site: null, autosave: false, onLoaded: vi.fn(), onUploaded: vi.fn() }))
    await waitFor(() => expect(storedDraftKey()).toBeNull())
    expect(loadLocalSite()).not.toBeNull()
  })

  it('never starts a new site over a server copy that failed to open, and retries it', async () => {
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
    expect(loadLocalSite()).toBeNull()
    fail = false
    act(() => result.current.retry())
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(saved))
    expect(result.current.key).toBe(KEY)
  })

  it('sends the record before a preview link, a checkout or a publish, once per change', async () => {
    const api = fakeApi()
    const { result } = renderHook(() => useDraft({ api, site: finishedSite(), autosave: false, onLoaded: vi.fn(), onUploaded: vi.fn() }))
    await act(async () => { await result.current.createPreview() })
    expect(api.saveDraft).toHaveBeenCalledTimes(1)
    expect(api.createPreview).toHaveBeenCalledWith(KEY)
    const checked = finishedSite({ business: { name: 'Checked Ltd' } })
    let url = ''
    await act(async () => { url = await result.current.checkout('joes', checked) })
    expect(url).toBe('https://checkout.stripe.com/c/pay/cs_test_1')
    expect(api.saveDraft).toHaveBeenCalledTimes(2)
    expect((api.saveDraft.mock.calls[1] as unknown as [string, Site])[1].business.name).toBe('Checked Ltd')
    expect(api.checkout).toHaveBeenCalledWith(KEY, 'joes', undefined)
    await act(async () => { await result.current.publish(undefined, undefined, checked) })
    expect(api.saveDraft).toHaveBeenCalledTimes(2)
    expect(api.publish).toHaveBeenCalledWith(KEY, undefined, undefined)
    expect(result.current.published).toEqual({ slug: 'joes', url: 'https://joes.x/' })
  })

  it('forgets this browser’s site on Start over', async () => {
    saveLocalSite(finishedSite())
    rememberDraftKey(KEY)
    const { result } = renderHook(() => useDraft({ api: fakeApi(), site: null, autosave: false, onLoaded: vi.fn(), onUploaded: vi.fn() }))
    act(() => result.current.forget())
    expect(loadLocalSite()).toBeNull()
    expect(storedDraftKey()).toBeNull()
  })
})
