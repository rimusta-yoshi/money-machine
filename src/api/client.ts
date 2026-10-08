import type { Site } from '../site/schema'

/**
 * The builder's side of the API (server/core/api.ts). Plain fetch, no state: the draft key
 * is passed in by the caller (see useDraft).
 */

/** A failed call, with a message written for the customer. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly extra: Record<string, unknown>

  constructor(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.extra = extra
  }
}

export interface DraftState { record: unknown; slug: string | null; publishedUrl: string | null; updatedAt: number; paid?: boolean; refunded?: boolean; disputed?: boolean }
/** What the server says about paying (GET /v1/config): the price lives only there. */
export interface Shop { pricePence: number; currency: string; launched: boolean; refundDays: number }
export type CheckoutState = { state: 'waiting' } | { state: 'live'; url: string } | { state: 'refunded' }
export type RefundState =
  | { state: 'ok'; amount: number; siteUrl: string; until: string }
  | { state: 'used' }
  | { state: 'expired'; support: string }
  | { state: 'disputed'; support: string }
  | { state: 'refunded'; amount: number }
export interface SlugStatus { slug: string; available: boolean; url?: string; message?: string; suggestion?: string | null }

/** The API's address (VITE_API_URL), or null when this build has no server (nothing is saved). */
export function apiBase(env: { VITE_API_URL?: string } = import.meta.env): string | null {
  return env.VITE_API_URL?.trim().replace(/\/+$/, '') || null
}

/** The domain sites are published under, from the API's address (api.<domain>). */
export const siteDomain = (base: string): string => new URL(base).host.replace(/^api\./, '')

export type Api = ReturnType<typeof createApi>

/**
 * What to say when the server can't be reached. The local dev server (*.localhost) uses a
 * self-signed certificate: once Chrome forgets it was accepted, every call fails silently, so
 * say how to fix that instead of blaming the connection.
 */
export function unreachable(base: string): string {
  const local = /^https:\/\/[^/]+\.localhost(:\d+)?$/.test(base)
  return local
    ? `Can't reach the local server. Is npm run dev:pay running? If it is, open ${base}/health, choose Advanced, then Proceed, and try again.`
    : 'We could not reach the server. Check your connection and try again.'
}

export function createApi(base: string, fetcher: typeof fetch = (...a) => fetch(...a)) {
  async function call<T>(path: string, init: RequestInit & { key?: string; admin?: string } = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (init.key) headers.set('Authorization', `Bearer ${init.key}`)
    if (init.admin) headers.set('X-Admin-Key', init.admin)
    let res: Response
    try {
      res = await fetcher(`${base}${path}`, { ...init, headers })
    } catch {
      throw new ApiError(0, 'offline', unreachable(base))
    }
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    if (!res.ok) {
      const { error, message, ...extra } = body
      throw new ApiError(res.status, String(error ?? 'error'), String(message ?? 'Something went wrong. Please try again.'), extra)
    }
    return body as T
  }
  const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  return {
    createDraft: () => call<{ key: string }>('/v1/drafts', { method: 'POST' }).then(r => r.key),
    loadDraft: (key: string) => call<DraftState>('/v1/draft', { key }),
    saveDraft: (key: string, site: Site) => call<{ updatedAt: number }>('/v1/draft', { ...json('PUT', site), key }),
    uploadPhoto: (key: string, photo: Blob) =>
      call<{ url: string }>('/v1/draft/photos', { method: 'POST', body: photo, headers: { 'Content-Type': photo.type || 'application/octet-stream' }, key }).then(r => r.url),
    createPreview: (key: string) => call<{ url: string; expiresAt: string }>('/v1/draft/preview', { method: 'POST', key }),
    slugStatus: (key: string, slug: string) => call<SlugStatus>(`/v1/slugs/${encodeURIComponent(slug)}`, { key }),
    /** Puts the saved record live: free for a paid site (at its own address), else with the admin key. */
    publish: (key: string, slug?: string, admin?: string) => call<{ slug: string; url: string }>('/v1/draft/publish', { ...json('POST', slug ? { slug } : {}), key, admin }),
    /** Opens a Stripe Checkout for the saved record; the price is set by the server. Before launch it needs the tester code. */
    checkout: (key: string, slug: string, testerCode?: string) =>
      call<{ url: string }>('/v1/draft/checkout', { ...json('POST', testerCode ? { slug, testerCode } : { slug }), key }).then(r => r.url),
    shop: () => call<Shop>('/v1/config'),
    checkoutStatus: (sessionId: string) => call<CheckoutState>(`/v1/checkouts/${encodeURIComponent(sessionId)}`),
    refundStatus: (token: string) => call<RefundState>('/v1/refund/status', json('POST', { token })),
    /** A used or expired link answers 409 with its state, which is what the page shows. */
    refund: (token: string) => call<RefundState>('/v1/refund', json('POST', { token })).catch(err => {
      if (err instanceof ApiError && err.status === 409 && typeof err.extra.state === 'string') return { ...err.extra } as RefundState
      throw err
    }),
    requestEditLink: (email: string) => call<{ message: string }>('/v1/edit-link', json('POST', { email })).then(r => r.message),
  }
}
