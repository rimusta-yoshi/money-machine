import type { CustomHostnames, HostnameInfo } from './ports'

/**
 * Cloudflare for SaaS custom hostnames over plain fetch (like stripe.ts): customers' own
 * domains on our zone. Cloudflare checks the customer's CNAME and issues the HTTPS certificate
 * itself (HTTP validation, served by Cloudflare once the CNAME points at us). Each hostname also
 * comes with an ownership TXT record (_cf-custom-hostname.<host>): the customer adds it too, and
 * nothing is served at the domain until we've seen it (domainLifecycle.ts), so pointing a CNAME
 * isn't enough to claim someone else's domain.
 * https://developers.cloudflare.com/api/resources/custom_hostnames/
 */

const API = 'https://api.cloudflare.com/client/v4'
/** Cloudflare's code for "that hostname exists already on this zone". */
const DUPLICATE = 1406
/** No call to Cloudflare holds up a page (or the cron) for longer than this. */
const TIMEOUT_MS = 8000

interface CfHostname {
  id: string; hostname: string; status?: string; ssl?: { status?: string } | null
  /** The TXT record that proves the customer owns the domain. */
  ownership_verification?: { type?: string; name?: string; value?: string } | null
}
interface CfAnswer<T> { success?: boolean; errors?: { code?: number; message?: string }[]; result?: T }

/** A failed call. The message is for our logs, never the customer, and never holds the token. */
export class SaasError extends Error {
  readonly status: number
  readonly codes: number[]
  constructor(status: number, codes: number[], message: string) {
    super(message)
    this.name = 'SaasError'
    this.status = status
    this.codes = codes
  }
}

const info = (h: CfHostname): HostnameInfo => {
  const v = h.ownership_verification
  return {
    id: h.id, hostname: h.hostname, status: h.status ?? 'pending', sslStatus: h.ssl?.status ?? null,
    verify: v?.type === 'txt' && v.name && v.value ? { name: v.name.toLowerCase().replace(/\.$/, ''), value: v.value } : null,
  }
}

/** Live: Cloudflare routes it to us and the certificate is issued. */
export const isLive = (h: HostnameInfo): boolean => h.status === 'active' && h.sslStatus === 'active'

export function cloudflareHostnames(token: string, zoneId: string, fetcher: typeof fetch = (...a) => fetch(...a)): CustomHostnames {
  async function call<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<{ status: number; answer: CfAnswer<T> }> {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (body) headers['Content-Type'] = 'application/json'
    let res: Response
    try {
      res = await fetcher(`${API}/zones/${zoneId}/custom_hostnames${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(TIMEOUT_MS) })
    } catch (err) {
      throw new SaasError(0, [], `Cloudflare could not be reached: ${String(err)}`)
    }
    const answer = await res.json().catch(() => ({})) as CfAnswer<T>
    return { status: res.status, answer }
  }
  const fail = (what: string, status: number, a: CfAnswer<unknown>) =>
    new SaasError(status, (a.errors ?? []).map(e => e.code ?? 0), `Cloudflare ${what} failed (${status}): ${(a.errors ?? []).map(e => `${e.code} ${e.message}`).join('; ').slice(0, 300)}`)

  const hostnames: CustomHostnames = {
    async create(hostname) {
      const { status, answer } = await call<CfHostname>('POST', '', {
        hostname, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } },
      })
      if (status < 300 && answer.success !== false && answer.result) return info(answer.result)
      // Left on our zone by an attempt that failed half-way: take it over.
      if (answer.errors?.some(e => e.code === DUPLICATE)) {
        const existing = await hostnames.find(hostname)
        if (existing) return existing
      }
      throw fail(`creating ${hostname}`, status, answer)
    },
    async get(id) {
      const { status, answer } = await call<CfHostname>('GET', `/${encodeURIComponent(id)}`)
      if (status === 404) return null
      if (status >= 300 || !answer.result) throw fail('reading a hostname', status, answer)
      return info(answer.result)
    },
    async find(hostname) {
      const { status, answer } = await call<CfHostname[]>('GET', `?hostname=${encodeURIComponent(hostname)}`)
      if (status >= 300 || !Array.isArray(answer.result)) throw fail('finding a hostname', status, answer)
      const hit = answer.result.find(h => h.hostname === hostname)
      return hit ? info(hit) : null
    },
    async remove(id) {
      const { status, answer } = await call<unknown>('DELETE', `/${encodeURIComponent(id)}`)
      if (status === 404 || status < 300) return
      throw fail('removing a hostname', status, answer)
    },
  }
  return hostnames
}
