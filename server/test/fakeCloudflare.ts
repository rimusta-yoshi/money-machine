/**
 * Stands in for Cloudflare's custom hostnames API, public DNS (DNS over HTTPS) and a Domain
 * Connect DNS provider in the tests, like fakeStripe.ts does for Stripe: answers the API worker's
 * outgoing requests and remembers them. Tests decide what each domain's DNS says and when
 * Cloudflare calls a hostname live.
 */

export const CF_TOKEN = 'cf-test-token-0123456789abcdefghij'
export const ZONE_ID = '0123456789abcdef0123456789abcdef'
export const TARGET = 'domains.localblocks.test'
/** Our Domain Connect ids in the test stack. */
export const DC_PROVIDER_ID = 'localblocks.test'
export const DC_SERVICE = 'website'

export interface FakeHostname {
  id: string; hostname: string; status: string; ssl: { status: string }
  ownership_verification: { type: 'txt'; name: string; value: string }
}

interface Zone {
  /** Nameservers; empty: the domain doesn't exist (NXDOMAIN). */
  ns: string[]
  /** CNAME answers by name. */
  cname: Record<string, string>
  /** TXT answers by name. */
  txt: Record<string, string>
  /** The _domainconnect TXT record's value, if the provider offers Domain Connect. */
  domainConnect?: string
}

let n = 0

export function fakeCloudflare() {
  const hostnames = new Map<string, FakeHostname>()
  const zones = new Map<string, Zone>()
  /** DNS providers' Domain Connect APIs: host → whether they take our template. */
  const dcProviders = new Map<string, { providerId: string; name: string; supports: boolean }>()
  const calls: string[] = []
  let failApi = false

  const reply = (body: unknown, status = 200, type = 'application/json') => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': type } })

  function cloudflareApi(req: Request, url: URL, body: string): Response {
    if (req.headers.get('Authorization') !== `Bearer ${CF_TOKEN}`) return reply({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] }, 403)
    if (failApi) return reply({ success: false, errors: [{ code: 1000, message: 'down' }] }, 500)
    const base = `/client/v4/zones/${ZONE_ID}/custom_hostnames`
    if (!url.pathname.startsWith(base)) return reply({ success: false, errors: [{ code: 7003, message: 'no route' }] }, 404)
    const id = url.pathname.slice(base.length + 1)
    if (req.method === 'POST' && !id) {
      const { hostname } = JSON.parse(body) as { hostname: string }
      if ([...hostnames.values()].some(h => h.hostname === hostname)) return reply({ success: false, errors: [{ code: 1406, message: 'Duplicate custom hostname found.' }] }, 409)
      const id = `ch${(++n).toString().padStart(6, '0')}`
      const h: FakeHostname = {
        id, hostname, status: 'pending', ssl: { status: 'initializing' },
        ownership_verification: { type: 'txt', name: `_cf-custom-hostname.${hostname}`, value: `own-${id}-0000-1111` },
      }
      hostnames.set(h.id, h)
      return reply({ success: true, result: h })
    }
    if (req.method === 'GET' && !id) {
      const name = url.searchParams.get('hostname')
      return reply({ success: true, result: [...hostnames.values()].filter(h => !name || h.hostname === name) })
    }
    const h = hostnames.get(id)
    if (!h) return reply({ success: false, errors: [{ code: 1436, message: 'not found' }] }, 404)
    if (req.method === 'GET') return reply({ success: true, result: h })
    if (req.method === 'DELETE') {
      hostnames.delete(id)
      return reply({ success: true, result: { id } })
    }
    return reply({ success: false, errors: [] }, 405)
  }

  /** The registered domain a name sits under, among the zones the test set up. */
  const zoneOf = (name: string): [string, Zone] | null => {
    for (const [domain, z] of zones) if (name === domain || name.endsWith(`.${domain}`)) return [domain, z]
    return null
  }

  function doh(url: URL): Response {
    const name = url.searchParams.get('name') ?? ''
    const type = url.searchParams.get('type')
    const found = zoneOf(name)
    if (!found || !found[1].ns.length) return reply({ Status: 3 }, 200, 'application/dns-json')
    const [domain, z] = found
    const answer = (t: number, data: string) => ({ name, type: t, TTL: 300, data })
    if (type === 'NS' && name === domain) return reply({ Status: 0, Answer: z.ns.map(ns => answer(2, `${ns}.`)) })
    if (type === 'CNAME' && z.cname[name]) return reply({ Status: 0, Answer: [answer(5, `${z.cname[name]}.`)] })
    if (type === 'TXT' && z.txt[name]) return reply({ Status: 0, Answer: [answer(16, `"${z.txt[name]}"`)] })
    if (type === 'TXT' && name === `_domainconnect.${domain}` && z.domainConnect) return reply({ Status: 0, Answer: [answer(16, `"${z.domainConnect}"`)] })
    return reply({ Status: 0 })
  }

  function domainConnectApi(url: URL): Response | null {
    const p = dcProviders.get(url.host)
    if (!p) return null
    const settings = /^\/v2\/([^/]+)\/settings$/.exec(url.pathname)
    if (settings) {
      return reply({
        providerId: p.providerId, providerName: p.name, providerDisplayName: p.name,
        urlSyncUX: `https://dcc.${url.host}`, urlAPI: `https://${url.host}`, width: 750, height: 750,
      })
    }
    if (url.pathname === `/v2/domainTemplates/providers/${DC_PROVIDER_ID}/services/${DC_SERVICE}`) return p.supports ? reply({ version: 1 }) : reply({}, 404)
    return reply({}, 404)
  }

  async function handle(req: Request): Promise<Response | null> {
    const url = new URL(req.url)
    const body = req.method === 'POST' ? await req.text() : ''
    if (url.host === 'api.cloudflare.com') {
      calls.push(`${req.method} ${url.pathname}`)
      return cloudflareApi(req, url, body)
    }
    if (url.host === 'cloudflare-dns.com') return doh(url)
    return domainConnectApi(url)
  }

  return {
    handle, hostnames, calls,
    /** A domain that exists, run by these nameservers (godaddy: ns01.domaincontrol.com…). */
    addDomain: (domain: string, ns: string[], o: { domainConnect?: string } = {}) => { zones.set(domain, { ns, cname: {}, txt: {}, domainConnect: o.domainConnect }) },
    /** The customer adds their record: the name now points at us (or anywhere). */
    point: (name: string, to: string) => { zoneOf(name)![1].cname[name] = to },
    /** The customer adds Cloudflare's ownership TXT record for this hostname (as Cloudflare gave it). */
    prove: (hostname: string) => {
      const v = [...hostnames.values()].find(x => x.hostname === hostname)!.ownership_verification
      zoneOf(hostname)![1].txt[v.name] = v.value
    },
    /** Someone else's TXT record, or a wrong one. */
    setTxt: (name: string, value: string) => { zoneOf(name)![1].txt[name] = value },
    /** Cloudflare loses a hostname (deleted in the dashboard, say). */
    lose: (hostname: string) => {
      const h = [...hostnames.values()].find(x => x.hostname === hostname)
      if (h) hostnames.delete(h.id)
    },
    /** A DNS provider with a Domain Connect API at this host. */
    addDcProvider: (host: string, providerId: string, name: string, supports = true) => { dcProviders.set(host, { providerId, name, supports }) },
    /** Cloudflare validates the hostname and issues the certificate. */
    goLive: (hostname: string) => {
      const h = [...hostnames.values()].find(x => x.hostname === hostname)!
      Object.assign(h, { status: 'active', ssl: { status: 'active' } })
    },
    /** The customer's record went away: Cloudflare stops routing it. */
    moveAway: (hostname: string) => {
      const h = [...hostnames.values()].find(x => x.hostname === hostname)!
      Object.assign(h, { status: 'moved' })
    },
    byName: (hostname: string) => [...hostnames.values()].find(h => h.hostname === hostname) ?? null,
    failApi: (on: boolean) => { failApi = on },
  }
}

/** Settings that switch own domains on in a test stack. */
export const DOMAIN_VARS = {
  CF_SAAS_TOKEN: CF_TOKEN,
  CF_ZONE_ID: ZONE_ID,
  DOMAINS_TARGET: TARGET,
}
