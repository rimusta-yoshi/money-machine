import { describe, expect, it } from 'vitest'
import { checkDomain, cleanDomainInput } from './domainName'
import { PROVIDER_IDS, providerFromNameservers } from './providers'
import { fillStep, GENERAL_GUIDE, PROVIDER_GUIDES } from './providerSteps'

const OURS = ['localblocks.co.uk', 'siteblocks.co.uk']

describe('a domain the customer types', () => {
  it('is cleaned of what people paste around it', () => {
    expect(cleanDomainInput('  HTTPS://WWW.Smith.co.uk/contact?x=1 ')).toBe('www.smith.co.uk')
    expect(cleanDomainInput('smith.co.uk.')).toBe('smith.co.uk')
    expect(cleanDomainInput('smith.co.uk:443')).toBe('smith.co.uk')
  })

  it('becomes www.<domain>, or the subdomain they typed', () => {
    expect(checkDomain('smithplumbing.co.uk', OURS)).toEqual({ ok: true, domain: 'smithplumbing.co.uk', hostname: 'www.smithplumbing.co.uk', host: 'www' })
    expect(checkDomain('https://www.smithplumbing.co.uk/', OURS)).toMatchObject({ hostname: 'www.smithplumbing.co.uk', host: 'www' })
    expect(checkDomain('shop.smith.com', OURS)).toMatchObject({ domain: 'smith.com', hostname: 'shop.smith.com', host: 'shop' })
    expect(checkDomain('jones.org.uk', OURS)).toMatchObject({ domain: 'jones.org.uk' })
    expect(checkDomain('café.co.uk', OURS)).toMatchObject({ domain: 'xn--caf-dma.co.uk' })
  })

  it('refuses what isn’t a public domain, or is ours', () => {
    const problem = (s: string) => {
      const c = checkDomain(s, OURS)
      return c.ok ? null : c.problem
    }
    expect(problem('')).toBe('empty')
    expect(problem('co.uk')).toBe('suffix_only')
    expect(problem('smith')).toBe('bad_characters')
    expect(problem('smith plumbing.co.uk')).toBe('bad_characters')
    expect(problem('me@smith.co.uk')).toBe('bad_characters')
    expect(problem('192.168.0.1')).toBe('ip_address')
    expect(problem('smith.local')).toBe('not_public')
    expect(problem('smith.test')).toBe('not_public')
    expect(problem(`${'a'.repeat(64)}.co.uk`)).toBe('bad_characters')
    expect(problem(`${'abcdefghi.'.repeat(26)}co.uk`)).toBe('too_long')
    expect(problem('localblocks.co.uk')).toBe('ours')
    expect(problem('www.localblocks.co.uk')).toBe('ours')
    expect(problem('joes.siteblocks.co.uk')).toBe('ours')
  })
})

describe('domain companies', () => {
  it('are told apart by their nameservers', () => {
    expect(providerFromNameservers(['ns71.domaincontrol.com.', 'ns72.domaincontrol.com'])).toBe('godaddy')
    expect(providerFromNameservers(['ns1045.ui-dns.com', 'ns1083.ui-dns.org'])).toBe('ionos')
    expect(providerFromNameservers(['ns1.123-reg.co.uk'])).toBe('123-reg')
    expect(providerFromNameservers(['dns1.registrar-servers.com'])).toBe('namecheap')
    expect(providerFromNameservers(['ada.ns.cloudflare.com'])).toBe('cloudflare')
    expect(providerFromNameservers(['ns-cloud-a1.googledomains.com'])).toBe('squarespace')
    expect(providerFromNameservers(['ns1.example-host.net'])).toBeNull()
    expect(providerFromNameservers([])).toBeNull()
  })

  it('each have a few short steps, one of which shows the record', () => {
    for (const guide of [...PROVIDER_IDS.map(id => PROVIDER_GUIDES[id]), GENERAL_GUIDE]) {
      expect(guide.steps.length).toBeGreaterThanOrEqual(3)
      expect(guide.steps.length).toBeLessThanOrEqual(4)
      expect(guide.steps.filter(s => s.record)).toHaveLength(1)
      expect(guide.forwarding).toContain('{hostname}')
    }
    expect(fillStep('Open {domain}, add {host} for {hostname}', { domain: 'a.co.uk', host: 'www', hostname: 'www.a.co.uk' })).toBe('Open a.co.uk, add www for www.a.co.uk')
  })
})
