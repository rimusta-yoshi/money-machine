import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BRAND } from './config'

/** The name and domain live in config.ts; the Cloudflare configs must agree with it. */
const config = (name: string) => readFileSync(join(process.cwd(), 'server', `wrangler.${name}.jsonc`), 'utf8')
const routes = (text: string) => [...text.matchAll(/"pattern":\s*"([^"]+)"/g)].map(m => m[1])

describe('brand', () => {
  it('is Local Blocks at localblocks.co.uk, with a lowercase wordmark', () => {
    expect(BRAND.name).toBe('Local Blocks')
    expect(BRAND.wordmark).toBe('localblocks')
    expect(BRAND.domain).toBe('localblocks.co.uk')
    expect(BRAND.email).toBe(`hello@${BRAND.domain}`)
  })

  it('every worker serves the domain in config.ts, and only that one', () => {
    for (const name of ['api', 'site', 'app']) {
      const text = config(name)
      // The site worker's */* catches customers' own domains (Cloudflare for SaaS) on our zone.
      for (const r of routes(text)) expect(r === BRAND.domain || r.endsWith(`.${BRAND.domain}/*`) || (name === 'site' && r === '*/*'), `${name}: ${r}`).toBe(true)
      for (const z of text.matchAll(/"zone_name":\s*"([^"]+)"/g)) expect(z[1]).toBe(BRAND.domain)
      const base = /"BASE_DOMAIN":\s*"([^"]+)"/.exec(text)?.[1]
      if (base) expect(base).toBe(BRAND.domain)
      expect(text).not.toMatch(/siteblocks\.co\.uk/)
    }
    expect(config('api')).toContain(`"EMAIL_FROM": "${BRAND.name} <${BRAND.email}>"`)
    expect(config('api')).toContain(`"SUPPORT_EMAIL": "${BRAND.email}"`)
    expect(config('api')).not.toContain('BRAND_NAME')
  })

  it('own domains: the Domain Connect template points where the API tells customers to', () => {
    const template = JSON.parse(readFileSync(join(process.cwd(), 'server', 'domainconnect', `${BRAND.domain}.website.json`), 'utf8'))
    const target = /"DOMAINS_TARGET":\s*"([^"]+)"/.exec(config('api'))?.[1]
    expect(target).toBe(`domains.${BRAND.domain}`)
    expect(template).toMatchObject({ providerId: BRAND.domain, providerName: BRAND.name, serviceId: 'website', syncPubKeyDomain: BRAND.domain, syncRedirectDomain: BRAND.domain })
    expect(template.records).toEqual([
      { type: 'CNAME', host: '@', pointsTo: target, ttl: 3600 },
      // Cloudflare's ownership check, next to the record (server/core/saas.ts).
      { type: 'TXT', host: '_cf-custom-hostname', data: '%verify%', ttl: 3600, txtConflictMatchingMode: 'All' },
    ])
  })

  it('launch is one switch: noindex in both workers is on exactly while LAUNCHED is off', () => {
    const launched = /"LAUNCHED":\s*"(true|false)"/.exec(config('api'))?.[1]
    expect(launched).toMatch(/^(true|false)$/)
    for (const name of ['api', 'site']) {
      expect(/"NOINDEX":\s*"(true|false)"/.exec(config(name))?.[1], `${name} NOINDEX`).toBe(launched === 'true' ? 'false' : 'true')
    }
  })

  it('the old domain redirects to the new one', () => {
    const text = config('redirect')
    expect(text).toContain(`"NEW_DOMAIN": "${BRAND.domain}"`)
    expect(routes(text)).toEqual(['siteblocks.co.uk', '*.siteblocks.co.uk/*'])
  })
})
