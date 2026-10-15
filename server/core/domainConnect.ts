import { z } from 'zod'
import type { DomainConnectConfig } from './config'
import type { Dns, DnsProviderInfo, DomainConnect } from './ports'

/**
 * One-click connecting with Domain Connect (https://www.domainconnect.org), synchronous flow,
 * with us as the service provider. Our template is server/domainconnect/<providerId>.<serviceId>.json;
 * each DNS provider must approve it before it works with them, so it's switched on per provider
 * (DC_PROVIDERS). Until then everyone gets the step-by-step guide, which always works.
 *
 * 1. Discovery: the TXT record _domainconnect.<domain> names the provider's API host; its
 *    /v2/<domain>/settings say who they are and where the customer approves changes (urlSyncUX).
 * 2. Template check: <urlAPI>/v2/domainTemplates/providers/<us>/services/<service> answers 2xx
 *    once they've taken our template.
 * 3. Apply: the customer goes to <urlSyncUX>/v2/domainTemplates/providers/<us>/services/<service>/apply?…,
 *    signed with our private key (the public key is a TXT record under the template's syncPubKeyDomain),
 *    logs in there, approves, and comes back to redirect_uri.
 */

const TIMEOUT_MS = 4000
const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

const settingsShape = z.object({
  providerId: z.string().min(1).max(100),
  providerName: z.string().min(1).max(100),
  providerDisplayName: z.string().max(100).optional(),
  urlSyncUX: z.string().url().startsWith('https://').max(300).optional(),
  urlAPI: z.string().url().startsWith('https://').max(300),
})

const strip = (url: string): string => url.replace(/\/+$/, '')

/** Discovery over plain fetch and DNS. Every failure is just "no one-click": the guide still works. */
export function httpDomainConnect(c: DomainConnectConfig, dns: Dns, fetcher: typeof fetch = (...a) => fetch(...a)): DomainConnect {
  const get = (url: string) => fetcher(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  return {
    async discover(domain) {
      try {
        const txt = await dns.lookup(`_domainconnect.${domain}`, 'TXT')
        const apiHost = txt.answers[0]?.trim().toLowerCase().replace(/\.$/, '').replace(/^https:\/\//, '').replace(/\/.*$/, '')
        if (!apiHost || !HOST.test(apiHost)) return null
        const res = await get(`https://${apiHost}/v2/${encodeURIComponent(domain)}/settings`)
        if (!res.ok) return null
        const parsed = settingsShape.safeParse(await res.json())
        if (!parsed.success || !parsed.data.urlSyncUX) return null
        const s = parsed.data
        // Only providers that approved our template, switched on one by one.
        if (!providerEnabled(c, s.providerId, s.providerName)) return null
        const template = await get(`${strip(s.urlAPI)}/v2/domainTemplates/providers/${encodeURIComponent(c.providerId)}/services/${encodeURIComponent(c.serviceId)}`)
        if (!template.ok) return null
        return { providerId: s.providerId, name: s.providerDisplayName || s.providerName, syncUx: strip(s.urlSyncUX!) }
      } catch (err) {
        console.warn(`Domain Connect discovery for ${domain} failed`, err)
        return null
      }
    },
  }
}

/** Switched on for this provider (DC_PROVIDERS lists ids or names, lower case). */
export const providerEnabled = (c: Pick<DomainConnectConfig, 'providers'>, id: string, name: string): boolean =>
  c.providers.has(id.toLowerCase()) || c.providers.has(name.toLowerCase())

/** PEM or bare base64 PKCS#8 to its bytes. */
function pkcs8Bytes(key: string): Uint8Array<ArrayBuffer> {
  const b64 = key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\\n|\s/g, '')
  const bin = atob(b64)
  return Uint8Array.from(bin, ch => ch.charCodeAt(0))
}

let keyCache: { pem: string; key: Promise<CryptoKey> } | null = null

function signingKey(pem: string): Promise<CryptoKey> {
  if (keyCache?.pem !== pem) {
    keyCache = { pem, key: crypto.subtle.importKey('pkcs8', pkcs8Bytes(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']) }
  }
  return keyCache.key
}

const base64 = (bytes: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(bytes)))

/** A query string with each key and value URL-encoded, in the order given. */
const query = (params: [string, string][]): string => params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')

/** Signs a query string as Domain Connect asks: RS256 over the whole string, base64. */
export async function signQuery(privateKey: string, q: string): Promise<string> {
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await signingKey(privateKey), new TextEncoder().encode(q))
  return base64(sig)
}

export interface ApplyRequest {
  /** The registered domain: example.co.uk. */
  domain: string
  /** Where the record goes: www (or the subdomain they chose). */
  host: string
  /** Back to the builder afterwards. */
  redirectUri: string
  /** Comes back with the customer, so the page knows it's a return from their domain company. */
  state: string
}

/** The signed address that takes the customer to their DNS provider to approve our template. */
export async function applyUrl(c: DomainConnectConfig, provider: DnsProviderInfo, r: ApplyRequest): Promise<string> {
  const q = query([['domain', r.domain], ['host', r.host], ['redirect_uri', r.redirectUri], ['state', r.state]])
  const sig = await signQuery(c.privateKey, q)
  // The key's name and the signature come last, outside what's signed (Cloudflare wants sig the very last).
  const path = `/v2/domainTemplates/providers/${encodeURIComponent(c.providerId)}/services/${encodeURIComponent(c.serviceId)}/apply`
  return `${provider.syncUx}${path}?${q}&${query([['key', c.keyHost], ['sig', sig]])}`
}
