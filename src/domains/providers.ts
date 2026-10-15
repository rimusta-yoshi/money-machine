/**
 * The domain companies (DNS providers) our UK customers mostly use, told apart by the domain's
 * nameservers. The server detects one; the builder shows that company's own steps
 * (src/domains/providerSteps.ts), or general steps for anyone else.
 */

export const PROVIDER_IDS = ['godaddy', 'ionos', '123-reg', 'fasthosts', 'namecheap', 'cloudflare', 'squarespace'] as const
export type ProviderId = typeof PROVIDER_IDS[number]

/** Each company's nameservers end in one of these. */
const NAMESERVERS: Record<ProviderId, RegExp> = {
  godaddy: /\.domaincontrol\.com$/,
  ionos: /\.ui-dns\.(com|org|biz|de)$/,
  '123-reg': /\.123-reg\.co\.uk$/,
  fasthosts: /\.(fasthosts\.net\.uk|livedns\.co\.uk)$/,
  namecheap: /\.registrar-servers\.com$/,
  cloudflare: /\.ns\.cloudflare\.com$/,
  // Google Domains moved its customers to Squarespace; both sets of nameservers are still about.
  squarespace: /\.(squarespacedns\.com|googledomains\.com)$/,
}

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  godaddy: 'GoDaddy',
  ionos: 'IONOS',
  '123-reg': '123-reg',
  fasthosts: 'Fasthosts',
  namecheap: 'Namecheap',
  cloudflare: 'Cloudflare',
  squarespace: 'Squarespace',
}

/** The company whose nameservers these are, or null for one we don't know. */
export function providerFromNameservers(nameservers: readonly string[]): ProviderId | null {
  for (const ns of nameservers) {
    const name = ns.toLowerCase().replace(/\.$/, '')
    const hit = PROVIDER_IDS.find(id => NAMESERVERS[id].test(name))
    if (hit) return hit
  }
  return null
}

export const isProviderId = (v: unknown): v is ProviderId => typeof v === 'string' && (PROVIDER_IDS as readonly string[]).includes(v)
