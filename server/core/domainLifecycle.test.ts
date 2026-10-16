import { describe, expect, it, vi } from 'vitest'
import { dropDomain, refreshDomain, sweepDomains } from './domainLifecycle'
import type { CustomHostnames, Deps, DomainPatch, DomainRow, DomainStatus, DomainStore, HostnameInfo } from './ports'
import { cloudflareHostnames } from './saas'

/** The lifecycle's edge cases with an in-memory store and a scripted Cloudflare (the full journey is in server/test/domains.test.ts). */

const row = (o: Partial<DomainRow> = {}): DomainRow => ({
  ref: 'r1', hostname: 'www.a.co.uk', domain: 'a.co.uk', apex: null, cfId: null, cfApexId: null, status: 'pending', provider: null,
  dc: null, dnsSeen: null, verify: null, verifiedAt: null, createdAt: 0, checkedAt: null, activeAt: null, liveEmailAt: null, ...o,
})

function store(initial: DomainRow[], o: { beforeUpdate?: (rows: Map<string, DomainRow>) => void } = {}) {
  const rows = new Map(initial.map(r => [r.ref, r]))
  const s: Partial<DomainStore> = {
    byRef: async ref => rows.get(ref) ?? null,
    async update(ref: string, patch: DomainPatch, expected?: DomainStatus) {
      o.beforeUpdate?.(rows)
      const r = rows.get(ref)
      if (!r || (expected && r.status !== expected)) return false
      rows.set(ref, { ...r, ...patch })
      return true
    },
    delete: async ref => { rows.delete(ref) },
    ended: async () => [...rows.values()].filter(r => r.status === 'removing').map(r => ({ ...r, slug: null, email: null, siteLive: false, takenDown: false })),
    disputed: async () => [],
    resumable: async () => [],
    due: async () => [],
  }
  return { rows, domains: s as DomainStore }
}

const hostname = (id: string, h = 'www.a.co.uk'): HostnameInfo => ({ id, hostname: h, status: 'pending', sslStatus: 'pending_validation', verify: null })

function deps(domains: DomainStore, saas: Partial<CustomHostnames> | null): Deps {
  return {
    domains, saas: saas as CustomHostnames | null, now: () => 1000,
    dns: { lookup: async () => ({ status: 'ok', answers: [] }) },
    db: { draftByRef: async () => null },
  } as unknown as Deps
}

describe('refreshDomain', () => {
  it('removes a hostname it re-made for a row that changed meanwhile', async () => {
    // Cloudflare lost the hostname; while we re-make it, the domain is disconnected elsewhere.
    const { domains } = store([row({ cfId: 'lost' })], { beforeUpdate: rows => rows.set('r1', { ...rows.get('r1')!, status: 'removing' }) })
    const remove = vi.fn(async () => undefined)
    const saas = { get: async () => null, create: async () => hostname('remade'), remove }
    const out = await refreshDomain(deps(domains, saas), row({ cfId: 'lost' }))
    expect(remove).toHaveBeenCalledWith('remade')
    expect(out.status).toBe('removing')
  })

  it('leaves a hostname alone that another check already stored', async () => {
    const { domains } = store([row()], { beforeUpdate: rows => rows.set('r1', { ...rows.get('r1')!, status: 'active', cfId: 'same' }) })
    const remove = vi.fn(async () => undefined)
    await refreshDomain(deps(domains, { get: async () => null, create: async () => hostname('same'), remove }), row())
    expect(remove).not.toHaveBeenCalled()
  })

  it('never re-makes a hostname for a paused or removing domain', async () => {
    const create = vi.fn(async () => hostname('x'))
    for (const status of ['paused', 'removing'] as const) {
      const { domains } = store([row({ status })])
      await refreshDomain(deps(domains, { get: async () => null, create }), row({ status }))
    }
    expect(create).not.toHaveBeenCalled()
  })
})

describe('dropDomain', () => {
  it('forgets a domain with nothing on Cloudflare even when own domains are switched off', async () => {
    const { domains, rows } = store([row({ status: 'paused' })])
    expect(await dropDomain(deps(domains, null), 'r1', { republish: false })).toBe(true)
    expect(rows.size).toBe(0)
  })

  it('keeps one with hostnames as "removing" when Cloudflare can’t be told, and says so', async () => {
    const { domains, rows } = store([row({ cfId: 'c1' })])
    expect(await dropDomain(deps(domains, null), 'r1', { republish: false })).toBe(false)
    expect(rows.get('r1')!.status).toBe('removing')
  })
})

describe('sweepDomains', () => {
  it('counts a removal only when it worked', async () => {
    const { domains } = store([row({ cfId: 'c1', status: 'removing' })])
    const failing = { remove: async () => { throw new Error('down') } }
    expect((await sweepDomains(deps(domains, failing), { daily: true })).removed).toBe(0)
    expect((await sweepDomains(deps(domains, { remove: async () => undefined }), { daily: true })).removed).toBe(1)
  })
})

describe('the Cloudflare API', () => {
  it('gives every call a time limit, and reads the ownership record', async () => {
    const signals: (AbortSignal | null | undefined)[] = []
    const fetcher = (async (_url: string, init?: RequestInit) => {
      signals.push(init?.signal)
      return new Response(JSON.stringify({
        success: true,
        result: { id: 'h1', hostname: 'www.a.co.uk', status: 'pending', ownership_verification: { type: 'txt', name: '_cf-custom-hostname.www.a.co.uk.', value: 'abc' } },
      }))
    }) as typeof fetch
    const api = cloudflareHostnames('token-0123456789abcdefghij', '0'.repeat(32), fetcher)
    expect(await api.create('www.a.co.uk')).toMatchObject({ verify: { name: '_cf-custom-hostname.www.a.co.uk', value: 'abc' } })
    await api.get('h1')
    expect(signals).toHaveLength(2)
    for (const s of signals) expect(s).toBeInstanceOf(AbortSignal)
  })
})
