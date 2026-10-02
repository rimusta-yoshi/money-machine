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

export interface DraftState { record: unknown; slug: string | null; publishedUrl: string | null; updatedAt: number }
export interface SlugStatus { slug: string; available: boolean; url?: string; message?: string; suggestion?: string | null }

/** The API's address (VITE_API_URL), or null when this build has no server (nothing is saved). */
export function apiBase(env: { VITE_API_URL?: string } = import.meta.env): string | null {
  return env.VITE_API_URL?.trim().replace(/\/+$/, '') || null
}

/** The domain sites are published under, from the API's address (api.<domain>). */
export const siteDomain = (base: string): string => new URL(base).host.replace(/^api\./, '')

export type Api = ReturnType<typeof createApi>

export function createApi(base: string, fetcher: typeof fetch = (...a) => fetch(...a)) {
  async function call<T>(path: string, init: RequestInit & { key?: string; admin?: string } = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (init.key) headers.set('Authorization', `Bearer ${init.key}`)
    if (init.admin) headers.set('X-Admin-Key', init.admin)
    let res: Response
    try {
      res = await fetcher(`${base}${path}`, { ...init, headers })
    } catch {
      throw new ApiError(0, 'offline', 'We could not reach the server. Check your connection and try again.')
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
    publish: (key: string, slug: string, admin: string) => call<{ slug: string; url: string }>('/v1/draft/publish', { ...json('POST', { slug }), key, admin }),
  }
}
