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
      for (const r of routes(text)) expect(r === BRAND.domain || r.endsWith(`.${BRAND.domain}/*`), `${name}: ${r}`).toBe(true)
      const base = /"BASE_DOMAIN":\s*"([^"]+)"/.exec(text)?.[1]
      if (base) expect(base).toBe(BRAND.domain)
      expect(text).not.toMatch(/siteblocks\.co\.uk/)
    }
    expect(config('api')).toContain(`"EMAIL_FROM": "${BRAND.name} <${BRAND.email}>"`)
    expect(config('api')).toContain(`"SUPPORT_EMAIL": "${BRAND.email}"`)
    expect(config('api')).not.toContain('BRAND_NAME')
  })

  it('the old domain redirects to the new one', () => {
    const text = config('redirect')
    expect(text).toContain(`"NEW_DOMAIN": "${BRAND.domain}"`)
    expect(routes(text)).toEqual(['siteblocks.co.uk', '*.siteblocks.co.uk/*'])
  })
})
